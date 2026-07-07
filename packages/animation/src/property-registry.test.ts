import { LayerType, PropertyValueType } from "@motion-studio/shared";
import { describe, expect, it } from "vitest";
import { numberLerp } from "./interpolators";
import { AnimatablePropertyRegistry } from "./property-registry";

function opacityDefinition() {
  return {
    layerType: LayerType.Text,
    propertyKey: "opacity",
    valueType: PropertyValueType.Number,
    defaultValue: 1,
    interpolate: numberLerp,
    validate: (value: number) => value >= 0 && value <= 1,
  };
}

describe("AnimatablePropertyRegistry", () => {
  it("registers and retrieves a property definition scoped to a layer type", () => {
    const registry = new AnimatablePropertyRegistry();
    const definition = opacityDefinition();
    registry.register(definition);
    expect(registry.get(LayerType.Text, "opacity")).toBe(definition);
    expect(registry.has(LayerType.Text, "opacity")).toBe(true);
  });

  it("does not leak a property registered for one layer type into another", () => {
    const registry = new AnimatablePropertyRegistry();
    registry.register(opacityDefinition());
    expect(registry.has(LayerType.Shape, "opacity")).toBe(false);
  });

  it("throws when registering a duplicate (layerType, propertyKey) pair", () => {
    const registry = new AnimatablePropertyRegistry();
    registry.register(opacityDefinition());
    expect(() => registry.register(opacityDefinition())).toThrow(/already registered/);
  });

  it("require throws for an unknown property", () => {
    const registry = new AnimatablePropertyRegistry();
    expect(() => registry.require(LayerType.Text, "missing")).toThrow(/unknown property/);
  });

  it("getAll filters by layer type", () => {
    const registry = new AnimatablePropertyRegistry();
    registry.register(opacityDefinition());
    registry.register({ ...opacityDefinition(), layerType: LayerType.Shape });
    expect(registry.getAll(LayerType.Text)).toHaveLength(1);
  });
});
