import {
  LayerType,
  RenderBackend,
  createAssetId,
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

  it("uploads a resolved image-source texture via copyExternalImageToTexture", () => {
    const { backend, device } = makeBackend();
    backend.init({ width: 100, height: 100 });
    const fakeImage = {} as CanvasImageSource;
    backend.drawFrame(
      sceneGraph([
        node({
          layerId: "a",
          assetId: createAssetId("asset-1"),
          texture: {
            kind: "image-source",
            source: fakeImage,
            width: 10,
            height: 10,
            isLive: false,
          },
        }),
      ]),
    );

    const copyCalls = device.calls.filter((c) => c.op === "copyExternalImageToTexture");
    expect(copyCalls).toEqual([{ op: "copyExternalImageToTexture", source: fakeImage }]);
    const uniformWrite = device.calls.find(
      (c): c is Extract<typeof c, { op: "writeBuffer" }> =>
        c.op === "writeBuffer" && c.data.length === 12,
    );
    expect(uniformWrite).toBeDefined();
  });

  it("re-uploads a live video texture every frame but uploads a static image only once", () => {
    const { backend, device } = makeBackend();
    backend.init({ width: 100, height: 100 });
    const fakeImage = {} as CanvasImageSource;
    const staticNode = node({
      layerId: "static",
      assetId: createAssetId("asset-static"),
      texture: { kind: "image-source", source: fakeImage, width: 10, height: 10, isLive: false },
    });
    const liveNode = node({
      layerId: "live",
      assetId: createAssetId("asset-live"),
      texture: { kind: "image-source", source: fakeImage, width: 10, height: 10, isLive: true },
    });

    backend.drawFrame(sceneGraph([staticNode, liveNode]));
    backend.drawFrame(sceneGraph([staticNode, liveNode]));

    expect(device.calls.filter((c) => c.op === "copyExternalImageToTexture")).toHaveLength(3);
  });

  it("re-initializing (a frame-size change) clears the texture cache instead of reusing bind groups tied to the old pipeline/buffer", () => {
    const { backend, device } = makeBackend();
    backend.init({ width: 100, height: 100 });
    const fakeImage = {} as CanvasImageSource;
    const staticNode = node({
      layerId: "a",
      assetId: createAssetId("asset-1"),
      texture: { kind: "image-source", source: fakeImage, width: 10, height: 10, isLive: false },
    });

    backend.drawFrame(sceneGraph([staticNode]));
    expect(device.calls.filter((c) => c.op === "copyExternalImageToTexture")).toHaveLength(1);

    // Simulates CanvasPanel's resize effect: RenderingEngine.setTarget()
    // calls init() again on this same backend instance, not a fresh one.
    backend.init({ width: 200, height: 200 });
    backend.drawFrame(sceneGraph([staticNode]));

    // If the stale cache entry (with its uploaded=true flag) survived the
    // re-init, this second draw would skip re-uploading entirely.
    expect(device.calls.filter((c) => c.op === "copyExternalImageToTexture")).toHaveLength(2);
  });
});
