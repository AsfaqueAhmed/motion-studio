import { createAnimationClipId, createPropertyTrackId, type ICommand } from "@motion-studio/shared";
import { CompositeCommand } from "@motion-studio/history";
import {
  createAnimationClip,
  createKeyframe,
  createPropertyTrack,
  AddKeyframeCommand,
  type AnimationEngine,
} from "@motion-studio/animation";
import type { LayerEngine } from "@motion-studio/layer";
import type { CommandBus } from "../command-bus";
import { AddAnimationClipCommand } from "../commands/add-animation-clip-command";
import { AddPropertyTrackCommand } from "../commands/add-property-track-command";
import { UpdateLayerCommand } from "../commands/update-layer-command";
import type { IAddKeyframeIntent, ISetLayerPropertyIntent } from "../intents";

/** Resolves Inspector-shaped Intents (static edits + keyframing) into Commands. See `TimelineEditorService`'s doc comment on staying a thin façade. */
export class InspectorEditorService {
  constructor(
    private readonly layerEngine: LayerEngine,
    private readonly animationEngine: AnimationEngine,
    private readonly commandBus: CommandBus,
  ) {}

  setLayerProperty(intent: ISetLayerPropertyIntent): void {
    const { layerId, propertyKey, value } = intent.payload;
    this.commandBus.execute(
      new UpdateLayerCommand(crypto.randomUUID(), this.layerEngine, layerId, propertyKey, value),
    );
  }

  /** Adds a keyframe, creating the Clip and/or PropertyTrack it needs first if this is the property's first keyframe. */
  addKeyframe(intent: IAddKeyframeIntent): void {
    const { layerId, layerType, propertyKey, tick, value } = intent.payload;
    const commands: ICommand[] = [];

    let clip = this.animationEngine.getClipForLayer(layerId);
    if (!clip) {
      clip = createAnimationClip({
        id: createAnimationClipId(crypto.randomUUID()),
        layerId,
        layerType,
        name: `${layerType} animation`,
      });
      commands.push(new AddAnimationClipCommand(crypto.randomUUID(), this.animationEngine, clip));
    }

    let track = clip.propertyTrackIds
      .map((id) => this.animationEngine.propertyTracks.get(id))
      .find((existing) => existing?.propertyKey === propertyKey);
    if (!track) {
      const definition = this.animationEngine.properties.require(layerType, propertyKey);
      track = createPropertyTrack({
        id: createPropertyTrackId(crypto.randomUUID()),
        clipId: clip.id,
        propertyKey,
        valueType: definition.valueType,
      });
      commands.push(new AddPropertyTrackCommand(crypto.randomUUID(), this.animationEngine, track));
    }

    const keyframe = createKeyframe({ tick, value });
    commands.push(
      new AddKeyframeCommand(crypto.randomUUID(), this.animationEngine, track.id, keyframe),
    );

    this.commandBus.execute(new CompositeCommand(crypto.randomUUID(), "Add keyframe", commands));
  }
}
