import type {
  AnimationClipId,
  IAnimationClip,
  IEngine,
  IKeyframe,
  IPropertyTrack,
  LayerId,
  PropertyTrackId,
  Tick,
} from "@motion-studio/shared";
import { AnimationClipRegistry } from "./animation-clip-registry";
import { registerBuiltinProperties } from "./builtin-properties";
import { evaluateSegment, SegmentLocator } from "./evaluator";
import { AnimatablePropertyRegistry } from "./property-registry";
import { PropertyTrackRegistry } from "./property-track-registry";

/**
 * Owns "per-property keyframes/interpolation, evaluated per frame"
 * (CLAUDE.md engine ownership table). Never touches rendering or storage.
 * Composes the property/clip/track registries and is the only thing
 * allowed to mutate an `IAnimationClip.propertyTrackIds` array or an
 * `IPropertyTrack.keyframes` array after creation — mirrors
 * `TimelineEngine`'s ownership of `ITrack.items`.
 */
export class AnimationEngine implements IEngine {
  readonly name = "Animation";
  readonly properties = new AnimatablePropertyRegistry();
  readonly clips = new AnimationClipRegistry();
  readonly propertyTracks = new PropertyTrackRegistry();

  private readonly segmentLocators = new Map<PropertyTrackId, SegmentLocator>();

  initialize(): void {
    registerBuiltinProperties(this.properties);
  }

  ready(): void {}

  dispose(): void {
    this.properties.clear();
    this.clips.clear();
    this.propertyTracks.clear();
    this.segmentLocators.clear();
  }

  /** Throws if the Layer already has a Clip — see `IAnimationClip` doc comment on multi-clip blending (ADR-005 #3, open). */
  addClip(clip: IAnimationClip): void {
    if (this.getClipForLayer(clip.layerId)) {
      throw new Error(
        `AnimationEngine: layer "${clip.layerId}" already has an AnimationClip — multi-clip blending is not yet supported (ADR-005 #3 is still open).`,
      );
    }
    this.clips.add(clip);
  }

  removeClip(id: AnimationClipId): void {
    const clip = this.requireClip(id);
    for (const trackId of clip.propertyTrackIds) {
      this.propertyTracks.remove(trackId);
      this.segmentLocators.delete(trackId);
    }
    this.clips.remove(id);
  }

  getClipForLayer(layerId: LayerId): IAnimationClip | undefined {
    return this.clips.getAll().find((clip) => clip.layerId === layerId);
  }

  /** Adds a Property Track to its Clip, rejecting a second track for a property the Clip already animates. */
  addPropertyTrack(track: IPropertyTrack): void {
    const clip = this.requireClip(track.clipId);
    const definition = this.properties.require(clip.layerType, track.propertyKey);
    if (definition.valueType !== track.valueType) {
      throw new Error(
        `AnimationEngine: property "${track.propertyKey}" on layer type "${clip.layerType}" is registered as ` +
          `"${definition.valueType}", not "${track.valueType}"`,
      );
    }
    const duplicate = clip.propertyTrackIds
      .map((id) => this.propertyTracks.get(id))
      .find((existing) => existing?.propertyKey === track.propertyKey);
    if (duplicate) {
      throw new Error(
        `AnimationEngine: clip "${clip.id}" already has a track for property "${track.propertyKey}"`,
      );
    }
    this.propertyTracks.add(track);
    clip.propertyTrackIds = [...clip.propertyTrackIds, track.id];
  }

  removePropertyTrack(id: PropertyTrackId): void {
    const track = this.requirePropertyTrack(id);
    const clip = this.requireClip(track.clipId);
    clip.propertyTrackIds = clip.propertyTrackIds.filter((trackId) => trackId !== id);
    this.propertyTracks.remove(id);
    this.segmentLocators.delete(id);
  }

  addKeyframe(trackId: PropertyTrackId, keyframe: IKeyframe): void {
    const track = this.requirePropertyTrack(trackId);
    if (track.keyframes.some((existing) => existing.tick === keyframe.tick)) {
      throw new Error(
        `AnimationEngine: track "${trackId}" already has a keyframe at tick ${keyframe.tick}`,
      );
    }
    this.validateValue(track, keyframe.value);
    track.keyframes = [...track.keyframes, keyframe].sort((a, b) => a.tick - b.tick);
    this.segmentLocators.get(trackId)?.invalidate();
  }

  moveKeyframe(trackId: PropertyTrackId, fromTick: Tick, toTick: Tick): void {
    const track = this.requirePropertyTrack(trackId);
    if (fromTick !== toTick && track.keyframes.some((existing) => existing.tick === toTick)) {
      throw new Error(
        `AnimationEngine: track "${trackId}" already has a keyframe at tick ${toTick}`,
      );
    }
    const keyframe = track.keyframes.find((existing) => existing.tick === fromTick);
    if (!keyframe) {
      throw new Error(`AnimationEngine: track "${trackId}" has no keyframe at tick ${fromTick}`);
    }
    keyframe.tick = toTick;
    track.keyframes = [...track.keyframes].sort((a, b) => a.tick - b.tick);
    this.segmentLocators.get(trackId)?.invalidate();
  }

  deleteKeyframe(trackId: PropertyTrackId, tick: Tick): void {
    const track = this.requirePropertyTrack(trackId);
    const next = track.keyframes.filter((existing) => existing.tick !== tick);
    if (next.length === track.keyframes.length) {
      throw new Error(`AnimationEngine: track "${trackId}" has no keyframe at tick ${tick}`);
    }
    track.keyframes = next;
    this.segmentLocators.get(trackId)?.invalidate();
  }

  modifyKeyframe(
    trackId: PropertyTrackId,
    tick: Tick,
    changes: Partial<Pick<IKeyframe, "value" | "interpolation" | "bezierControlPoints">>,
  ): void {
    const track = this.requirePropertyTrack(trackId);
    const keyframe = track.keyframes.find((existing) => existing.tick === tick);
    if (!keyframe) {
      throw new Error(`AnimationEngine: track "${trackId}" has no keyframe at tick ${tick}`);
    }
    if ("value" in changes) {
      this.validateValue(track, changes.value);
    }
    Object.assign(keyframe, changes);
    this.segmentLocators.get(trackId)?.invalidate();
  }

  /**
   * Public evaluation entry point (PLAN.md 6.4). Returns `undefined` if the
   * Layer has no Clip or the property has no track — callers fall back to
   * the Layer's own static value in that case.
   */
  evaluateAt(layerId: LayerId, propertyKey: string, tick: Tick): unknown {
    const clip = this.getClipForLayer(layerId);
    if (!clip) {
      return undefined;
    }
    const track = clip.propertyTrackIds
      .map((id) => this.propertyTracks.get(id))
      .find((existing) => existing?.propertyKey === propertyKey);
    if (!track || track.keyframes.length === 0) {
      return undefined;
    }

    const definition = this.properties.require(clip.layerType, propertyKey);
    let locator = this.segmentLocators.get(track.id);
    if (!locator) {
      locator = new SegmentLocator();
      this.segmentLocators.set(track.id, locator);
    }
    const segment = locator.locate(track.keyframes, tick);
    return evaluateSegment(segment, tick, definition);
  }

  requireClip(id: AnimationClipId): IAnimationClip {
    const clip = this.clips.get(id);
    if (!clip) {
      throw new Error(`AnimationEngine: unknown clip: "${id}"`);
    }
    return clip;
  }

  requirePropertyTrack(id: PropertyTrackId): IPropertyTrack {
    const track = this.propertyTracks.get(id);
    if (!track) {
      throw new Error(`AnimationEngine: unknown property track: "${id}"`);
    }
    return track;
  }

  private validateValue(track: IPropertyTrack, value: unknown): void {
    const clip = this.requireClip(track.clipId);
    const definition = this.properties.require(clip.layerType, track.propertyKey);
    if (!definition.validate(value)) {
      throw new Error(
        `AnimationEngine: invalid value for property "${track.propertyKey}" on track "${track.id}"`,
      );
    }
  }
}
