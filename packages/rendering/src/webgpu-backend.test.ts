import {
  LayerType,
  RenderBackend,
  createCompositionId,
  createLayerId,
  toTick,
} from "@motion-studio/shared";
import { describe, expect, it } from "vitest";
import type { ISceneGraph, ISceneGraphNode } from "./scene-graph";
import { FakeGPUCanvasContext, FakeWebGPUDevice } from "./test-support/fake-webgpu-context";
import { WebGPURenderBackend } from "./webgpu-backend";

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

function makeBackend() {
  const device = new FakeWebGPUDevice();
  const canvasContext = new FakeGPUCanvasContext();
  const backend = new WebGPURenderBackend({
    getDevice: () => device,
    getCanvasContext: () => canvasContext,
  });
  return { backend, device };
}

describe("WebGPURenderBackend", () => {
  it("reports its kind", () => {
    expect(makeBackend().backend.kind).toBe(RenderBackend.WebGPU);
  });

  it("does not throw during init (pipeline/buffers/bind group creation)", () => {
    const { backend } = makeBackend();
    expect(() => backend.init({ width: 100, height: 100 })).not.toThrow();
  });

  it("issues one draw call per node and submits once per frame", () => {
    const { backend, device } = makeBackend();
    backend.init({ width: 100, height: 100 });
    backend.drawFrame(sceneGraph([node({ layerId: "a" }), node({ layerId: "b" })]));

    expect(device.calls.filter((c) => c.op === "draw")).toHaveLength(2);
    expect(device.calls.filter((c) => c.op === "submit")).toHaveLength(1);
  });

  it("writes opacity into the uniform buffer's last float (color.a)", () => {
    const { backend, device } = makeBackend();
    backend.init({ width: 100, height: 100 });
    backend.drawFrame(sceneGraph([node({ layerId: "a", opacity: 0.75 })]));

    const writes = device.calls.filter(
      (c): c is Extract<typeof c, { op: "writeBuffer" }> => c.op === "writeBuffer",
    );
    const uniformWrite = writes.find((w) => w.data.length === 16);
    expect(uniformWrite?.data.at(-1)).toBe(0.75);
  });

  it("throws if drawFrame is called before init", () => {
    const { backend } = makeBackend();
    expect(() => backend.drawFrame(sceneGraph([]))).toThrow(/init/);
  });

  it("dispose() releases device/pipeline state so a later drawFrame throws", () => {
    const { backend } = makeBackend();
    backend.init({ width: 100, height: 100 });
    backend.dispose();
    expect(() => backend.drawFrame(sceneGraph([]))).toThrow(/init/);
  });
});
