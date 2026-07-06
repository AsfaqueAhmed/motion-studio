import { createLayerId } from "@motion-studio/shared";
import { describe, expect, it } from "vitest";
import { createShapeLayer } from "./layer-factory";
import { LayerRegistry } from "./layer-registry";

describe("LayerRegistry", () => {
  it("adds and retrieves a layer by id", () => {
    const registry = new LayerRegistry();
    const layer = createShapeLayer({ id: createLayerId("a"), name: "Box" });
    registry.add(layer);
    expect(registry.get(layer.id)).toBe(layer);
    expect(registry.has(layer.id)).toBe(true);
  });

  it("throws when adding a duplicate id", () => {
    const registry = new LayerRegistry();
    const layer = createShapeLayer({ id: createLayerId("a"), name: "Box" });
    registry.add(layer);
    expect(() => registry.add(layer)).toThrow(/already registered/);
  });

  it("throws when removing an unknown id", () => {
    const registry = new LayerRegistry();
    expect(() => registry.remove(createLayerId("missing"))).toThrow(/unknown layer/);
  });

  it("getAll returns every registered layer", () => {
    const registry = new LayerRegistry();
    const a = createShapeLayer({ id: createLayerId("a"), name: "A" });
    const b = createShapeLayer({ id: createLayerId("b"), name: "B" });
    registry.add(a);
    registry.add(b);
    expect(registry.getAll()).toEqual(expect.arrayContaining([a, b]));
    expect(registry.getAll()).toHaveLength(2);
  });

  it("clear empties the registry", () => {
    const registry = new LayerRegistry();
    registry.add(createShapeLayer({ id: createLayerId("a"), name: "A" }));
    registry.clear();
    expect(registry.getAll()).toEqual([]);
  });
});
