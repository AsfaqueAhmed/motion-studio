import { LayerType, PropertyValueType } from "@motion-studio/shared";
import { colorLerp, numberLerp } from "./interpolators";
import type { AnimatablePropertyRegistry } from "./property-registry";

const ALL_LAYER_TYPES: LayerType[] = [
  LayerType.Video,
  LayerType.Image,
  LayerType.Audio,
  LayerType.Text,
  LayerType.Sticker,
  LayerType.Shape,
  LayerType.Group,
];

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isHexColor(value: unknown): value is string {
  return typeof value === "string" && /^#([0-9a-fA-F]{6})$/.test(value);
}

/**
 * Seeds the baseline animatable surface every Layer type has today
 * (`transform.*` + `opacity`, from `ILayerBase`) plus each type's own
 * animatable fields. `IAnimatableLayer` (`@motion-studio/shared`) is
 * currently an alias for `ILayerBase` — every Layer type qualifies — so
 * this registers the base set against all of `LayerType` rather than a
 * subset. See docs/06-animation-engine/property-system.md.
 */
export function registerBuiltinProperties(registry: AnimatablePropertyRegistry): void {
  for (const layerType of ALL_LAYER_TYPES) {
    registry.register({
      layerType,
      propertyKey: "transform.x",
      valueType: PropertyValueType.Number,
      defaultValue: 0,
      interpolate: numberLerp,
      validate: isFiniteNumber,
    });
    registry.register({
      layerType,
      propertyKey: "transform.y",
      valueType: PropertyValueType.Number,
      defaultValue: 0,
      interpolate: numberLerp,
      validate: isFiniteNumber,
    });
    registry.register({
      layerType,
      propertyKey: "transform.scaleX",
      valueType: PropertyValueType.Number,
      defaultValue: 1,
      interpolate: numberLerp,
      validate: isFiniteNumber,
    });
    registry.register({
      layerType,
      propertyKey: "transform.scaleY",
      valueType: PropertyValueType.Number,
      defaultValue: 1,
      interpolate: numberLerp,
      validate: isFiniteNumber,
    });
    registry.register({
      layerType,
      propertyKey: "transform.rotation",
      valueType: PropertyValueType.Number,
      defaultValue: 0,
      interpolate: numberLerp,
      validate: isFiniteNumber,
    });
    registry.register({
      layerType,
      propertyKey: "opacity",
      valueType: PropertyValueType.Number,
      defaultValue: 1,
      interpolate: numberLerp,
      validate: (value: number) => isFiniteNumber(value) && value >= 0 && value <= 1,
    });
  }

  registry.register({
    layerType: LayerType.Text,
    propertyKey: "fontSize",
    valueType: PropertyValueType.Number,
    defaultValue: 48,
    interpolate: numberLerp,
    validate: (value: number) => isFiniteNumber(value) && value > 0,
  });
  registry.register({
    layerType: LayerType.Text,
    propertyKey: "color",
    valueType: PropertyValueType.Color,
    defaultValue: "#FFFFFF",
    interpolate: colorLerp,
    validate: isHexColor,
  });

  registry.register({
    layerType: LayerType.Shape,
    propertyKey: "fillColor",
    valueType: PropertyValueType.Color,
    defaultValue: "#FFFFFF",
    interpolate: colorLerp,
    validate: isHexColor,
  });
  // Layer Engine's default strokeColor is the keyword "transparent" (see
  // `@motion-studio/layer` layer-factory.ts), which colorLerp can't
  // interpolate (hex-only for now — see docs/06-animation-engine/
  // interpolation.md open questions). This registry's defaultValue is only
  // the Animation Engine's evaluation fallback, not the Layer's own default,
  // so the mismatch is intentional.
  registry.register({
    layerType: LayerType.Shape,
    propertyKey: "strokeColor",
    valueType: PropertyValueType.Color,
    defaultValue: "#000000",
    interpolate: colorLerp,
    validate: isHexColor,
  });
  registry.register({
    layerType: LayerType.Shape,
    propertyKey: "strokeWidth",
    valueType: PropertyValueType.Number,
    defaultValue: 0,
    interpolate: numberLerp,
    validate: (value: number) => isFiniteNumber(value) && value >= 0,
  });
  registry.register({
    layerType: LayerType.Shape,
    propertyKey: "cornerRadius",
    valueType: PropertyValueType.Number,
    defaultValue: 0,
    interpolate: numberLerp,
    validate: (value: number) => isFiniteNumber(value) && value >= 0,
  });

  registry.register({
    layerType: LayerType.Audio,
    propertyKey: "volume",
    valueType: PropertyValueType.Number,
    defaultValue: 1,
    interpolate: numberLerp,
    validate: (value: number) => isFiniteNumber(value) && value >= 0,
  });
}
