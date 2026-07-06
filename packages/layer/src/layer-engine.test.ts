import { createLayerId } from "@motion-studio/shared";
import { describe, expect, it } from "vitest";
import { createShapeLayer } from "./layer-factory";
import { LayerEngine } from "./layer-engine";

describe("LayerEngine", () => {
  it("wires registry and compositionGraph to the same store", () => {
    const engine = new LayerEngine();
    const layer = createShapeLayer({ id: createLayerId("a"), name: "Box" });

    engine.compositionGraph.addLayer(layer);

    expect(engine.registry.get(layer.id)).toBe(layer);
  });

  it("follows the initialize -> ready -> dispose lifecycle", async () => {
    const engine = new LayerEngine();
    await engine.initialize();
    await engine.ready();

    engine.compositionGraph.addLayer(createShapeLayer({ id: createLayerId("a"), name: "Box" }));
    await engine.dispose();

    expect(engine.registry.getAll()).toEqual([]);
  });
});
