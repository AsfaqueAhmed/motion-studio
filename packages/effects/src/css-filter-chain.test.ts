import { createEffectNodeId, EffectType } from "@motion-studio/shared";
import { describe, expect, it } from "vitest";
import { composeCssFilterChain } from "./css-filter-chain";
import type { IEffectNode } from "./effect-node";

function node(id: string, cssFilter?: string): IEffectNode {
  return {
    id: createEffectNodeId(id),
    type: EffectType.GaussianBlur,
    dependencyIds: [],
    wgsl: "",
    glsl: "",
    ...(cssFilter !== undefined ? { cssFilter } : {}),
  };
}

describe("composeCssFilterChain", () => {
  it("joins CSS filters in order", () => {
    const result = composeCssFilterChain([
      node("blur", "blur(4px)"),
      node("bright", "brightness(1.2)"),
    ]);
    expect(result.filter).toBe("blur(4px) brightness(1.2)");
    expect(result.unsupportedIds).toEqual([]);
  });

  it("reports nodes with no CSS equivalent and skips them", () => {
    const result = composeCssFilterChain([
      node("blur", "blur(4px)"),
      node("blend"),
      node("bright", "brightness(1.2)"),
    ]);
    expect(result.filter).toBe("blur(4px) brightness(1.2)");
    expect(result.unsupportedIds).toEqual(["blend"]);
  });

  it("returns an empty filter for an empty chain", () => {
    const result = composeCssFilterChain([]);
    expect(result.filter).toBe("");
    expect(result.unsupportedIds).toEqual([]);
  });
});
