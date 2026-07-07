import { BlendMode, createEffectNodeId, EffectType } from "@motion-studio/shared";
import { describe, expect, it } from "vitest";
import { canvasCompositeOperation, createBlendModeNode } from "./blend-modes";

describe("createBlendModeNode", () => {
  it("takes two dependencies in [bottom, top] order", () => {
    const node = createBlendModeNode(
      createEffectNodeId("blend"),
      createEffectNodeId("bottom"),
      createEffectNodeId("top"),
      BlendMode.Multiply,
    );
    expect(node.type).toBe(EffectType.BlendMode);
    expect(node.dependencyIds).toEqual(["bottom", "top"]);
  });

  it("has no CSS filter fallback (blending isn't a single-input filter)", () => {
    const node = createBlendModeNode(
      createEffectNodeId("blend"),
      createEffectNodeId("bottom"),
      createEffectNodeId("top"),
      BlendMode.Screen,
    );
    expect(node.cssFilter).toBeUndefined();
  });

  it.each(Object.values(BlendMode))("generates a WGSL and GLSL body for %s", (mode) => {
    const node = createBlendModeNode(
      createEffectNodeId("blend"),
      createEffectNodeId("bottom"),
      createEffectNodeId("top"),
      mode,
    );
    expect(node.wgsl).toContain("effectMain");
    expect(node.glsl).toContain("effectMain");
    expect(node.wgsl).not.toContain("undefined");
    expect(node.glsl).not.toContain("undefined");
  });
});

describe("canvasCompositeOperation", () => {
  it("maps Normal to source-over", () => {
    expect(canvasCompositeOperation(BlendMode.Normal)).toBe("source-over");
  });

  it("maps every blend mode to a distinct Canvas2D composite operation", () => {
    const ops = Object.values(BlendMode).map(canvasCompositeOperation);
    expect(new Set(ops).size).toBe(ops.length);
  });
});
