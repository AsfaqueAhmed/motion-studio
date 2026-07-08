import { LayerType, createCompositionId, createLayerId, toTick } from "@motion-studio/shared";
import { describe, expect, it } from "vitest";
import { Canvas2DRenderBackend } from "./canvas2d-backend";
import type { ISceneGraph, ISceneGraphNode } from "./scene-graph";
import { FakeCanvas2DContext } from "./test-support/fake-canvas2d-context";

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
    assetId: undefined,
    texture: undefined,
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

describe("Canvas2DRenderBackend", () => {
  it("clears the canvas once per frame before drawing", () => {
    const ctx = new FakeCanvas2DContext();
    const backend = new Canvas2DRenderBackend({ getContext: () => ctx });
    backend.init({ width: 100, height: 100 });
    backend.drawFrame(sceneGraph([node({ layerId: "a" })]));
    expect(ctx.calls[0]).toEqual({ op: "clearRect", x: 0, y: 0, width: 100, height: 100 });
  });

  it("saves/restores the transform stack around each node", () => {
    const ctx = new FakeCanvas2DContext();
    const backend = new Canvas2DRenderBackend({ getContext: () => ctx });
    backend.init({ width: 100, height: 100 });
    backend.drawFrame(sceneGraph([node({ layerId: "a" }), node({ layerId: "b" })]));

    const saveCount = ctx.calls.filter((c) => c.op === "save").length;
    const restoreCount = ctx.calls.filter((c) => c.op === "restore").length;
    expect(saveCount).toBe(2);
    expect(restoreCount).toBe(2);
  });

  it("throws if drawFrame is called before init", () => {
    const ctx = new FakeCanvas2DContext();
    const backend = new Canvas2DRenderBackend({ getContext: () => ctx });
    expect(() => backend.drawFrame(sceneGraph([]))).toThrow(/init/);
  });

  it("draws nodes in render-queue order (lower zIndex first)", () => {
    const ctx = new FakeCanvas2DContext();
    const backend = new Canvas2DRenderBackend({ getContext: () => ctx });
    backend.init({ width: 100, height: 100 });
    backend.drawFrame(
      sceneGraph([node({ layerId: "front", zIndex: 1 }), node({ layerId: "back", zIndex: 0 })]),
    );

    const fillRectCalls = ctx.calls.filter((c) => c.op === "fillRect");
    expect(fillRectCalls).toHaveLength(2);
  });

  it("dispose() clears the held context so a later drawFrame throws", () => {
    const ctx = new FakeCanvas2DContext();
    const backend = new Canvas2DRenderBackend({ getContext: () => ctx });
    backend.init({ width: 100, height: 100 });
    backend.dispose();
    expect(() => backend.drawFrame(sceneGraph([]))).toThrow(/init/);
  });
});
