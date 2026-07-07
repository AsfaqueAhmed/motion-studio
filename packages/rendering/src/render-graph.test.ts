import {
  DagCycleError,
  LayerType,
  createCompositionId,
  createLayerId,
  toTick,
} from "@motion-studio/shared";
import { describe, expect, it } from "vitest";
import { buildIdentityRenderGraph, getRenderGraphOutputNodeId, RenderGraph } from "./render-graph";
import type { ISceneGraph, ISceneGraphNode } from "./scene-graph";

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
    bounds: { x: 0, y: 0, width: 10, height: 10 },
    properties: {},
    ...rest,
  };
}

function sceneGraph(nodes: ISceneGraphNode[]): ISceneGraph {
  return {
    tick: toTick(0),
    compositionId: createCompositionId("comp-1"),
    width: 100,
    height: 100,
    nodes,
  };
}

describe("RenderGraph", () => {
  it("orders an effect chain dependency-first", () => {
    const graph = new RenderGraph();
    graph.addNode({ id: "source", dependencyIds: [] });
    graph.addNode({ id: "blur", dependencyIds: ["source"] });
    graph.addNode({ id: "output", dependencyIds: ["blur"] });
    expect(graph.executionOrder("output")).toEqual(["source", "blur", "output"]);
  });

  it("throws a DagCycleError for a cyclic chain", () => {
    const graph = new RenderGraph();
    graph.addNode({ id: "a", dependencyIds: ["b"] });
    graph.addNode({ id: "b", dependencyIds: ["a"] });
    expect(() => graph.executionOrder("a")).toThrow(DagCycleError);
  });
});

describe("buildIdentityRenderGraph", () => {
  it("adds one output node per Scene Graph layer", () => {
    const a = createLayerId("a");
    const b = createLayerId("b");
    const graph = buildIdentityRenderGraph(
      sceneGraph([node({ layerId: "a" }), node({ layerId: "b" })]),
    );
    expect(graph.hasNode(getRenderGraphOutputNodeId(a))).toBe(true);
    expect(graph.hasNode(getRenderGraphOutputNodeId(b))).toBe(true);
  });

  it("gives each layer's output node an empty dependency chain today (no Effects Engine yet)", () => {
    const a = createLayerId("a");
    const graph = buildIdentityRenderGraph(sceneGraph([node({ layerId: "a" })]));
    expect(graph.executionOrder(getRenderGraphOutputNodeId(a))).toEqual([
      getRenderGraphOutputNodeId(a),
    ]);
  });
});
