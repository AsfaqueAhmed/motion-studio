import { LayerType } from "@motion-studio/shared";
import { AnimatablePropertyRegistry } from "@motion-studio/animation";
import { registerBuiltinProperties } from "@motion-studio/animation";
import { describe, expect, it } from "vitest";
import { PropertySchemaRegistry } from "./property-schema-registry";

function buildRegistry(): AnimatablePropertyRegistry {
  const registry = new AnimatablePropertyRegistry();
  registerBuiltinProperties(registry);
  return registry;
}

describe("PropertySchemaRegistry", () => {
  it("includes the static rows for every layer type", () => {
    const schema = new PropertySchemaRegistry(buildRegistry()).getSchema(LayerType.Video);
    const keys = schema.map((row) => row.key);
    expect(keys).toEqual(expect.arrayContaining(["name", "visible", "locked"]));
    expect(schema.find((row) => row.key === "name")?.animatable).toBe(false);
  });

  it("includes every AnimatablePropertyRegistry entry for the layer type, marked animatable", () => {
    const schema = new PropertySchemaRegistry(buildRegistry()).getSchema(LayerType.Text);
    const keys = schema.map((row) => row.key);
    expect(keys).toEqual(expect.arrayContaining(["transform.x", "opacity", "fontSize", "color"]));
    expect(schema.find((row) => row.key === "fontSize")?.animatable).toBe(true);
  });

  it("picks an editor widget matching each property's value type", () => {
    const schema = new PropertySchemaRegistry(buildRegistry()).getSchema(LayerType.Shape);
    expect(schema.find((row) => row.key === "fillColor")?.editor).toBe("color");
    expect(schema.find((row) => row.key === "transform.scaleX")?.editor).toBe("number");
  });

  it("uses the angle editor for rotation, not a raw-radians number field", () => {
    const schema = new PropertySchemaRegistry(buildRegistry()).getSchema(LayerType.Shape);
    expect(schema.find((row) => row.key === "transform.rotation")?.editor).toBe("angle");
  });

  it("does not include Shape-only properties for a Text layer", () => {
    const schema = new PropertySchemaRegistry(buildRegistry()).getSchema(LayerType.Text);
    expect(schema.find((row) => row.key === "fillColor")).toBeUndefined();
  });
});
