import {
  LayerType,
  RenderBackend,
  createAssetId,
  createCompositionId,
  createLayerId,
  toTick,
} from "@motion-studio/shared";
import { describe, expect, it } from "vitest";
import { FakeWebGL2Context } from "./test-support/fake-webgl2-context";
import type { ISceneGraph, ISceneGraphNode } from "./scene-graph";
import { WebGL2RenderBackend } from "./webgl2-backend";

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

describe("WebGL2RenderBackend", () => {
  it("reports its kind", () => {
    expect(new WebGL2RenderBackend({ getContext: () => new FakeWebGL2Context() }).kind).toBe(
      RenderBackend.WebGL2,
    );
  });

  it("compiles and links a program during init", () => {
    const gl = new FakeWebGL2Context();
    const backend = new WebGL2RenderBackend({ getContext: () => gl });
    expect(() => backend.init({ width: 100, height: 100 })).not.toThrow();
  });

  it("issues one draw call per node, clearing once per frame", () => {
    const gl = new FakeWebGL2Context();
    const backend = new WebGL2RenderBackend({ getContext: () => gl });
    backend.init({ width: 100, height: 100 });
    backend.drawFrame(sceneGraph([node({ layerId: "a" }), node({ layerId: "b" })]));

    expect(gl.calls.filter((c) => c.op === "clear")).toHaveLength(1);
    expect(gl.calls.filter((c) => c.op === "drawArrays")).toHaveLength(2);
  });

  it("uploads each node's opacity into the color uniform's alpha channel", () => {
    const gl = new FakeWebGL2Context();
    const backend = new WebGL2RenderBackend({ getContext: () => gl });
    backend.init({ width: 100, height: 100 });
    backend.drawFrame(sceneGraph([node({ layerId: "a", opacity: 0.25 })]));

    const colorUniforms = gl.calls.filter(
      (c): c is Extract<typeof c, { op: "uniform4f" }> =>
        c.op === "uniform4f" && c.name === "u_color",
    );
    expect(colorUniforms).toHaveLength(1);
    expect(colorUniforms[0]?.w).toBe(0.25);
  });

  it("throws if drawFrame is called before init", () => {
    const backend = new WebGL2RenderBackend({ getContext: () => new FakeWebGL2Context() });
    expect(() => backend.drawFrame(sceneGraph([]))).toThrow(/init/);
  });

  it("dispose() releases the program so a later drawFrame throws", () => {
    const gl = new FakeWebGL2Context();
    const backend = new WebGL2RenderBackend({ getContext: () => gl });
    backend.init({ width: 100, height: 100 });
    backend.dispose();
    expect(() => backend.drawFrame(sceneGraph([]))).toThrow(/init/);
  });

  it("uploads a resolved image-source texture via texImage2D instead of the placeholder color", () => {
    const gl = new FakeWebGL2Context();
    const backend = new WebGL2RenderBackend({ getContext: () => gl });
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

    const colorUniforms = gl.calls.filter((c) => c.op === "uniform4f" && c.name === "u_color");
    expect(colorUniforms).toHaveLength(0);
    const texImage2DCalls = gl.calls.filter((c) => c.op === "texImage2D");
    expect(texImage2DCalls).toEqual([{ op: "texImage2D", source: fakeImage }]);
  });

  it("re-uploads a live video texture every frame but uploads a static image only once", () => {
    const gl = new FakeWebGL2Context();
    const backend = new WebGL2RenderBackend({ getContext: () => gl });
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

    expect(gl.calls.filter((c) => c.op === "texImage2D")).toHaveLength(3);
  });
});
