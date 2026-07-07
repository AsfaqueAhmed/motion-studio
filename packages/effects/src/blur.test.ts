import { createEffectNodeId, EffectType } from "@motion-studio/shared";
import { describe, expect, it } from "vitest";
import { createGaussianBlurNode, createGaussianBlurPair, gaussianKernelWeights } from "./blur";

describe("gaussianKernelWeights", () => {
  it("returns normalized weights summing to 1", () => {
    const weights = gaussianKernelWeights(4);
    const sum = weights.reduce((a, b) => a + b, 0);
    expect(sum).toBeCloseTo(1, 5);
  });

  it("is symmetric around the center tap", () => {
    const weights = gaussianKernelWeights(5);
    const mid = (weights.length - 1) / 2;
    for (let i = 0; i < mid; i++) {
      expect(weights[i]).toBeCloseTo(weights[weights.length - 1 - i] ?? NaN, 10);
    }
  });

  it("throws for a negative radius", () => {
    expect(() => gaussianKernelWeights(-1)).toThrow();
  });
});

describe("createGaussianBlurNode", () => {
  it("sets type, id, and single dependency", () => {
    const node = createGaussianBlurNode(createEffectNodeId("blur"), createEffectNodeId("src"), {
      radiusPx: 4,
      direction: "horizontal",
    });
    expect(node.id).toBe("blur");
    expect(node.type).toBe(EffectType.GaussianBlur);
    expect(node.dependencyIds).toEqual(["src"]);
  });

  it("generates a horizontal-direction kernel in both WGSL and GLSL", () => {
    const node = createGaussianBlurNode(createEffectNodeId("blur"), createEffectNodeId("src"), {
      radiusPx: 2,
      direction: "horizontal",
    });
    expect(node.wgsl).toContain("kDirection = vec2<f32>(1.0, 0.0)");
    expect(node.glsl).toContain("kDirection = vec2(1.0, 0.0)");
    expect(node.wgsl).toContain("effectMain");
    expect(node.glsl).toContain("#version 300 es");
  });

  it("generates a vertical-direction kernel", () => {
    const node = createGaussianBlurNode(createEffectNodeId("blur"), createEffectNodeId("src"), {
      radiusPx: 2,
      direction: "vertical",
    });
    expect(node.wgsl).toContain("kDirection = vec2<f32>(0.0, 1.0)");
  });

  it("sets a CSS blur() filter fallback matching the radius", () => {
    const node = createGaussianBlurNode(createEffectNodeId("blur"), createEffectNodeId("src"), {
      radiusPx: 6,
      direction: "horizontal",
    });
    expect(node.cssFilter).toBe("blur(6px)");
  });
});

describe("createGaussianBlurPair", () => {
  it("chains horizontal into vertical", () => {
    const [h, v] = createGaussianBlurPair("glow", createEffectNodeId("src"), 4);
    expect(h.dependencyIds).toEqual(["src"]);
    expect(v.dependencyIds).toEqual([h.id]);
    expect(h.id).toBe("glow:h");
    expect(v.id).toBe("glow:v");
  });
});
