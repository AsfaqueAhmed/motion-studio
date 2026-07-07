import { createEffectNodeId, EffectType } from "@motion-studio/shared";
import { describe, expect, it } from "vitest";
import { createColorAdjustmentNode } from "./color-adjustments";

const baseParams = {
  brightness: 1,
  contrast: 1,
  saturation: 1,
  hueDeg: 0,
  temperature: 0,
  tint: 0,
};

describe("createColorAdjustmentNode", () => {
  it("sets type and single dependency", () => {
    const node = createColorAdjustmentNode(
      createEffectNodeId("adjust"),
      createEffectNodeId("src"),
      baseParams,
    );
    expect(node.type).toBe(EffectType.ColorAdjustment);
    expect(node.dependencyIds).toEqual(["src"]);
  });

  it("composes a CSS filter string from brightness/contrast/saturation/hue when temperature and tint are 0", () => {
    const node = createColorAdjustmentNode(
      createEffectNodeId("adjust"),
      createEffectNodeId("src"),
      {
        ...baseParams,
        brightness: 1.2,
        contrast: 0.9,
        saturation: 1.1,
        hueDeg: 30,
      },
    );
    expect(node.cssFilter).toBe("brightness(1.2) contrast(0.9) saturate(1.1) hue-rotate(30deg)");
  });

  it("omits the CSS filter when temperature is non-zero", () => {
    const node = createColorAdjustmentNode(
      createEffectNodeId("adjust"),
      createEffectNodeId("src"),
      {
        ...baseParams,
        temperature: 0.3,
      },
    );
    expect(node.cssFilter).toBeUndefined();
  });

  it("omits the CSS filter when tint is non-zero", () => {
    const node = createColorAdjustmentNode(
      createEffectNodeId("adjust"),
      createEffectNodeId("src"),
      {
        ...baseParams,
        tint: -0.2,
      },
    );
    expect(node.cssFilter).toBeUndefined();
  });

  it("rejects a negative brightness", () => {
    expect(() =>
      createColorAdjustmentNode(createEffectNodeId("adjust"), createEffectNodeId("src"), {
        ...baseParams,
        brightness: -1,
      }),
    ).toThrow();
  });

  it("rejects temperature out of [-1, 1]", () => {
    expect(() =>
      createColorAdjustmentNode(createEffectNodeId("adjust"), createEffectNodeId("src"), {
        ...baseParams,
        temperature: 2,
      }),
    ).toThrow();
  });

  it("generates valid-looking WGSL and GLSL bodies", () => {
    const node = createColorAdjustmentNode(
      createEffectNodeId("adjust"),
      createEffectNodeId("src"),
      baseParams,
    );
    expect(node.wgsl).toContain("effectMain");
    expect(node.glsl).toContain("#version 300 es");
  });
});
