import type { InterpolationType, LayerType, PropertyValueType } from "./enums";
import type { AnimationClipId, LayerId, PropertyTrackId } from "./ids";
import type { Tick } from "./tick";

/** CSS-style cubic-bezier control points (each in [0, 1]). See docs/06-animation-engine/bezier.md. */
export interface ICubicBezierControlPoints {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

/**
 * One value change on a Property Track, in ticks — never floating-point
 * seconds (see GLOSSARY.md "Tick"). `bezierControlPoints` only applies when
 * `interpolation` is `InterpolationType.Bezier`; it shapes the ease curve
 * for the segment starting at this keyframe. See
 * docs/06-animation-engine/keyframes.md.
 */
export interface IKeyframe<TValue = unknown> {
  tick: Tick;
  value: TValue;
  interpolation: InterpolationType;
  bezierControlPoints?: ICubicBezierControlPoints;
}

/**
 * One Layer property's full animation: a tick-sorted, tick-unique array of
 * Keyframes. See docs/06-animation-engine/overview.md "Layer → Animation
 * Clip → Property Track(s) → Keyframe(s)".
 */
export interface IPropertyTrack {
  id: PropertyTrackId;
  clipId: AnimationClipId;
  propertyKey: string;
  valueType: PropertyValueType;
  keyframes: IKeyframe[];
}

/**
 * Groups all Property Tracks for one Layer so an animation is reusable as a
 * unit (e.g. copy a "Fade In" clip onto another Layer), not isolated
 * per-property keyframe sets. See docs/06-animation-engine/overview.md.
 *
 * `layerType` is denormalized from the referenced Layer at creation time.
 * Unlike `ITrackItem` deliberately *not* duplicating a Layer's mutable
 * `playbackRate` (see timeline.ts) to avoid drift, `layerType` never changes
 * after a Layer is created, so duplicating it here is safe — it lets
 * `AnimatablePropertyRegistry` resolve property definitions by
 * (layerType, propertyKey) without the Animation Engine importing the Layer
 * Engine's concrete classes (CLAUDE.md "never import each other's concrete
 * classes").
 *
 * Multi-clip blending (more than one Clip animating the same Layer
 * simultaneously) is an open decision — ADR-005 primitive #3, not yet
 * resolved, see docs/06-animation-engine/overview.md "Multi-clip blending"
 * — so today one Layer has at most one AnimationClip.
 */
export interface IAnimationClip {
  id: AnimationClipId;
  layerId: LayerId;
  layerType: LayerType;
  name: string;
  propertyTrackIds: PropertyTrackId[];
}
