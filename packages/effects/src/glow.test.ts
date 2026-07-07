import { createEffectNodeId } from "@motion-studio/shared";
import { describe, expect, it } from "vitest";
import { createGlowChain } from "./glow";

describe("createGlowChain", () => {
  it("returns four nodes: bright-pass, blur-h, blur-v, composite", () => {
    const nodes = createGlowChain("glow", createEffectNodeId("src"), {
      thresholdLevel: 0.8,
      intensity: 1.5,
      radiusPx: 8,
    });
    expect(nodes.map((n) => n.id)).toEqual([
      "glow:bright-pass",
      "glow:blur:h",
      "glow:blur:v",
      "glow:composite",
    ]);
  });

  it("chains dependencies source -> bright-pass -> blur-h -> blur-v, composite takes source and blur-v", () => {
    const [brightPass, blurH, blurV, composite] = createGlowChain(
      "glow",
      createEffectNodeId("src"),
      { thresholdLevel: 0.8, intensity: 1, radiusPx: 4 },
    );
    expect(brightPass?.dependencyIds).toEqual(["src"]);
    expect(blurH?.dependencyIds).toEqual([brightPass?.id]);
    expect(blurV?.dependencyIds).toEqual([blurH?.id]);
    expect(composite?.dependencyIds).toEqual(["src", blurV?.id]);
  });

  it("has no CSS filter fallback on the composite output", () => {
    const nodes = createGlowChain("glow", createEffectNodeId("src"), {
      thresholdLevel: 0.8,
      intensity: 1,
      radiusPx: 4,
    });
    expect(nodes.at(-1)?.cssFilter).toBeUndefined();
  });

  it("rejects an out-of-range threshold", () => {
    expect(() =>
      createGlowChain("glow", createEffectNodeId("src"), {
        thresholdLevel: 1.5,
        intensity: 1,
        radiusPx: 4,
      }),
    ).toThrow();
  });

  it("rejects a negative intensity", () => {
    expect(() =>
      createGlowChain("glow", createEffectNodeId("src"), {
        thresholdLevel: 0.8,
        intensity: -1,
        radiusPx: 4,
      }),
    ).toThrow();
  });
});
