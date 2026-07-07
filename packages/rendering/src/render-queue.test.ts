import { LayerType, createLayerId } from "@motion-studio/shared";
import { describe, expect, it } from "vitest";
import { sortRenderQueue } from "./render-queue";
import type { ISceneGraphNode } from "./scene-graph";

function node(
  overrides: Partial<Omit<ISceneGraphNode, "layerId">> & { layerId: string },
): ISceneGraphNode {
  const { layerId, ...rest } = overrides;
  return {
    layerId: createLayerId(layerId),
    type: LayerType.Shape,
    transform: { x: 0, y: 0, scaleX: 1, scaleY: 1, rotation: 0, anchorX: 0, anchorY: 0 },
    opacity: 1,
    zIndex: 0,
    bounds: { x: 0, y: 0, width: 1, height: 1 },
    properties: {},
    ...rest,
  };
}

describe("sortRenderQueue", () => {
  it("orders by zIndex ascending first", () => {
    const back = node({ layerId: "back", zIndex: 0 });
    const front = node({ layerId: "front", zIndex: 5 });
    expect(sortRenderQueue([front, back])).toEqual([back, front]);
  });

  it("groups equal zIndex nodes by blend mode", () => {
    const normal = node({ layerId: "normal", properties: {} });
    const multiply = node({ layerId: "multiply", properties: { blendMode: "multiply" } });
    const result = sortRenderQueue([multiply, normal]);
    expect(result.map((n) => n.layerId)).toEqual([
      createLayerId("multiply"),
      createLayerId("normal"),
    ]);
  });

  it("draws opaque nodes before transparent ones within the same zIndex/blend group", () => {
    const transparent = node({ layerId: "transparent", opacity: 0.5 });
    const opaque = node({ layerId: "opaque", opacity: 1 });
    expect(sortRenderQueue([transparent, opaque])).toEqual([opaque, transparent]);
  });

  it("does not mutate the input array", () => {
    const nodes = [node({ layerId: "b", zIndex: 1 }), node({ layerId: "a", zIndex: 0 })];
    const original = [...nodes];
    sortRenderQueue(nodes);
    expect(nodes).toEqual(original);
  });
});
