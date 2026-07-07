import type { LayerType, PropertyValueType } from "@motion-studio/shared";

/**
 * One entry in the `AnimatablePropertyRegistry`: everything needed to
 * keyframe a Layer property. `interpolate`/`validate` are behavior, not
 * serializable project data, which is why this lives in
 * `@motion-studio/animation` rather than `@motion-studio/shared` (unlike
 * `IKeyframe`/`IPropertyTrack`/`IAnimationClip`, which other engines
 * reference by id). See docs/06-animation-engine/property-system.md and
 * ADR-008 (not to be confused with the Inspector's
 * `PropertySchemaRegistry`).
 */
export interface IPropertyDefinition<TValue = unknown> {
  readonly layerType: LayerType;
  readonly propertyKey: string;
  readonly valueType: PropertyValueType;
  readonly defaultValue: TValue;
  interpolate(a: TValue, b: TValue, t: number): TValue;
  validate(value: TValue): boolean;
}
