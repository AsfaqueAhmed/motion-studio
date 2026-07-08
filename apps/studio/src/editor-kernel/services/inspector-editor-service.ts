import {
  createAnimationClipId,
  createPropertyTrackId,
  type IAnimationClip,
  type ICommand,
  type ILayer,
  type IPropertyTrack,
  type ITransform2D,
  type LayerId,
  type LayerType,
  type Tick,
} from "@motion-studio/shared";
import { CompositeCommand } from "@motion-studio/history";
import {
  createAnimationClip,
  createKeyframe,
  createPropertyTrack,
  AddKeyframeCommand,
  DeleteKeyframeCommand,
  ModifyKeyframeCommand,
  type AnimationEngine,
} from "@motion-studio/animation";
import type { LayerEngine } from "@motion-studio/layer";
import type { CommandBus } from "../command-bus";
import { AddAnimationClipCommand } from "../commands/add-animation-clip-command";
import { AddPropertyTrackCommand } from "../commands/add-property-track-command";
import { UpdateLayerCommand } from "../commands/update-layer-command";
import { TRANSFORM_KEYS } from "../frame-state-builder";
import { getLayerPropertyValue } from "../layer-property-path";
import type {
  ISetLayerPropertyIntent,
  ISetLayerTransformIntent,
  IToggleKeyframeIntent,
} from "../intents";

/** Resolves Inspector-shaped Intents (static edits + keyframing) into Commands. See `TimelineEditorService`'s doc comment on staying a thin façade. */
export class InspectorEditorService {
  constructor(
    private readonly layerEngine: LayerEngine,
    private readonly animationEngine: AnimationEngine,
    private readonly commandBus: CommandBus,
  ) {}

  setLayerProperty(intent: ISetLayerPropertyIntent): void {
    const { layerId, propertyKey, value, tick } = intent.payload;
    this.commandBus.execute(this.buildWriteCommand(layerId, propertyKey, value, tick));
  }

  /** Batched transform patch — one undo step for every changed field (e.g. a Canvas drag-resize/move gesture), unlike `setLayerProperty`'s single key. */
  setLayerTransform(intent: ISetLayerTransformIntent): void {
    const { layerId, transform, tick } = intent.payload;
    const commands = (Object.keys(transform) as Array<keyof ITransform2D>).map((key) =>
      this.buildWriteCommand(layerId, `transform.${key}`, transform[key], tick),
    );
    if (commands.length === 0) {
      return;
    }
    this.commandBus.execute(new CompositeCommand(crypto.randomUUID(), "Transform layer", commands));
  }

  /**
   * A plain static write is invisible for an animated property — Frame
   * State evaluation (and the Inspector's own `displayValue`) always
   * prefers the evaluated/keyframed value over the Layer's static field
   * whenever a track exists, so editing while animated has to go through
   * keyframes instead: update the keyframe already at `tick` if one's
   * there, otherwise add a new one there (this is how a second keyframe —
   * actual animation — gets created). Only a property with no track at all
   * writes straight to the static field.
   */
  private buildWriteCommand(
    layerId: LayerId,
    propertyKey: string,
    value: unknown,
    tick: Tick,
  ): ICommand {
    const clip = this.animationEngine.getClipForLayer(layerId);
    const track = clip?.propertyTrackIds
      .map((id) => this.animationEngine.propertyTracks.get(id))
      .find((existing) => existing?.propertyKey === propertyKey);

    if (!track) {
      return new UpdateLayerCommand(
        crypto.randomUUID(),
        this.layerEngine,
        layerId,
        propertyKey,
        value,
      );
    }
    if (track.keyframes.some((keyframe) => keyframe.tick === tick)) {
      return new ModifyKeyframeCommand(crypto.randomUUID(), this.animationEngine, track.id, tick, {
        value,
      });
    }
    return new AddKeyframeCommand(
      crypto.randomUUID(),
      this.animationEngine,
      track.id,
      createKeyframe({ tick, value }),
    );
  }

  /**
   * CapCut-style unified keyframe: one toggle for the whole transform
   * (`TRANSFORM_KEYS` — x, y, scaleX, scaleY, rotation together), not one
   * button per property. If any of those tracks already has a keyframe at
   * `tick`, this removes it (and any sibling keyframes at that same tick);
   * otherwise it adds one per transform key, creating the Clip/PropertyTrack
   * containers it needs first, same as the property-editing flow's
   * "first keyframe on this property" lazy-create. Always one
   * `CompositeCommand` — one undo step for the whole toggle either way.
   */
  toggleKeyframe(intent: IToggleKeyframeIntent): void {
    const { layerId, layerType, tick } = intent.payload;
    const layer = this.layerEngine.registry.get(layerId);
    if (!layer) {
      return;
    }

    const clip = this.animationEngine.getClipForLayer(layerId);
    const tracksByKey = new Map(
      TRANSFORM_KEYS.map((key) => [
        key,
        clip?.propertyTrackIds
          .map((id) => this.animationEngine.propertyTracks.get(id))
          .find((existing) => existing?.propertyKey === `transform.${key}`),
      ]),
    );

    const existingAtTick = [...tracksByKey.values()].filter(
      (track): track is IPropertyTrack =>
        !!track && track.keyframes.some((keyframe) => keyframe.tick === tick),
    );

    const commands: ICommand[] =
      existingAtTick.length > 0
        ? existingAtTick.map(
            (track) =>
              new DeleteKeyframeCommand(crypto.randomUUID(), this.animationEngine, track.id, tick),
          )
        : this.buildKeyframeAddCommands(layer, layerId, layerType, tick, clip, tracksByKey);

    if (commands.length === 0) {
      return;
    }
    this.commandBus.execute(new CompositeCommand(crypto.randomUUID(), "Toggle keyframe", commands));
  }

  private buildKeyframeAddCommands(
    layer: ILayer,
    layerId: LayerId,
    layerType: LayerType,
    tick: Tick,
    clip: IAnimationClip | undefined,
    tracksByKey: Map<(typeof TRANSFORM_KEYS)[number], IPropertyTrack | undefined>,
  ): ICommand[] {
    const commands: ICommand[] = [];
    let targetClip = clip;
    if (!targetClip) {
      targetClip = createAnimationClip({
        id: createAnimationClipId(crypto.randomUUID()),
        layerId,
        layerType,
        name: "Transform",
      });
      commands.push(
        new AddAnimationClipCommand(crypto.randomUUID(), this.animationEngine, targetClip),
      );
    }

    for (const key of TRANSFORM_KEYS) {
      const propertyKey = `transform.${key}`;
      let track = tracksByKey.get(key);
      if (!track) {
        const definition = this.animationEngine.properties.require(layerType, propertyKey);
        track = createPropertyTrack({
          id: createPropertyTrackId(crypto.randomUUID()),
          clipId: targetClip.id,
          propertyKey,
          valueType: definition.valueType,
        });
        commands.push(
          new AddPropertyTrackCommand(crypto.randomUUID(), this.animationEngine, track),
        );
      }
      const evaluated = this.animationEngine.evaluateAt(layerId, propertyKey, tick);
      const value = evaluated !== undefined ? evaluated : getLayerPropertyValue(layer, propertyKey);
      commands.push(
        new AddKeyframeCommand(
          crypto.randomUUID(),
          this.animationEngine,
          track.id,
          createKeyframe({ tick, value }),
        ),
      );
    }

    return commands;
  }
}
