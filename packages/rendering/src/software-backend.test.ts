import {
  LayerType,
  RenderBackend,
  createCompositionId,
  createLayerId,
  toTick,
} from "@motion-studio/shared";
import { describe, expect, it } from "vitest";
import { placeholderColor } from "./placeholder-color";
import { SoftwareRenderBackend } from "./software-backend";
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
    bounds: { x: 0, y: 0, width: 4, height: 4 },
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
    width: 8,
    height: 8,
    nodes,
  };
}

describe("SoftwareRenderBackend", () => {
  it("reports its kind", () => {
    expect(new SoftwareRenderBackend().kind).toBe(RenderBackend.Software);
  });

  it("allocates an RGBA framebuffer sized to the target", () => {
    const backend = new SoftwareRenderBackend();
    backend.init({ width: 8, height: 8 });
    expect(backend.getFramebuffer()).toHaveLength(8 * 8 * 4);
  });

  it("draws an opaque node's color into its bounds", () => {
    const backend = new SoftwareRenderBackend();
    backend.init({ width: 8, height: 8 });
    const n = node({ layerId: "a" });
    backend.drawFrame(sceneGraph([n]));

    const { r, g, b } = placeholderColor(n.layerId);
    const offset = (0 * 8 + 0) * 4;
    const framebuffer = backend.getFramebuffer();
    expect(framebuffer[offset]).toBe(r);
    expect(framebuffer[offset + 1]).toBe(g);
    expect(framebuffer[offset + 2]).toBe(b);
    expect(framebuffer[offset + 3]).toBe(255);
  });

  it("leaves pixels outside every node's bounds transparent", () => {
    const backend = new SoftwareRenderBackend();
    backend.init({ width: 8, height: 8 });
    backend.drawFrame(sceneGraph([node({ layerId: "a" })]));
    const offset = (7 * 8 + 7) * 4;
    expect(backend.getFramebuffer()[offset + 3]).toBe(0);
  });

  it("draws the higher zIndex node on top when bounds overlap", () => {
    const backend = new SoftwareRenderBackend();
    backend.init({ width: 8, height: 8 });
    const back = node({ layerId: "back", zIndex: 0 });
    const front = node({ layerId: "front", zIndex: 1 });
    backend.drawFrame(sceneGraph([front, back]));

    const { r, g, b } = placeholderColor(front.layerId);
    const framebuffer = backend.getFramebuffer();
    expect(framebuffer[0]).toBe(r);
    expect(framebuffer[1]).toBe(g);
    expect(framebuffer[2]).toBe(b);
  });

  it("clears the framebuffer between frames", () => {
    const backend = new SoftwareRenderBackend();
    backend.init({ width: 8, height: 8 });
    backend.drawFrame(sceneGraph([node({ layerId: "a" })]));
    backend.drawFrame(sceneGraph([]));
    expect(backend.getFramebuffer()[3]).toBe(0);
  });

  it("samples a raw-rgba texture instead of the placeholder color when present", () => {
    const backend = new SoftwareRenderBackend();
    backend.init({ width: 8, height: 8 });
    // 1x1 solid magenta texture, opaque.
    const pixels = new Uint8ClampedArray([255, 0, 255, 255]);
    backend.drawFrame(
      sceneGraph([
        node({ layerId: "a", texture: { kind: "raw-rgba", pixels, width: 1, height: 1 } }),
      ]),
    );

    const offset = (0 * 8 + 0) * 4;
    const framebuffer = backend.getFramebuffer();
    expect(framebuffer[offset]).toBe(255);
    expect(framebuffer[offset + 1]).toBe(0);
    expect(framebuffer[offset + 2]).toBe(255);
    expect(framebuffer[offset + 3]).toBe(255);
  });
});
