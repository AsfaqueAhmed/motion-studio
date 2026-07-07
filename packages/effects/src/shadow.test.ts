import { createEffectNodeId } from "@motion-studio/shared";
import { describe, expect, it } from "vitest";
import { createDropShadowChain } from "./shadow";

describe("createDropShadowChain", () => {
  const params = {
    offsetXPx: 4,
    offsetYPx: 6,
    blurRadiusPx: 8,
    color: { r: 0, g: 0, b: 0, a: 0.5 },
  };

  it("returns four nodes: silhouette, blur-h, blur-v, composite", () => {
    const nodes = createDropShadowChain("shadow", createEffectNodeId("src"), params);
    expect(nodes.map((n) => n.id)).toEqual([
      "shadow:silhouette",
      "shadow:blur:h",
      "shadow:blur:v",
      "shadow:composite",
    ]);
  });

  it("chains silhouette -> blur -> composite(blurV, original)", () => {
    const [silhouette, blurH, blurV, composite] = createDropShadowChain(
      "shadow",
      createEffectNodeId("src"),
      params,
    );
    expect(silhouette?.dependencyIds).toEqual(["src"]);
    expect(blurH?.dependencyIds).toEqual([silhouette?.id]);
    expect(blurV?.dependencyIds).toEqual([blurH?.id]);
    expect(composite?.dependencyIds).toEqual([blurV?.id, "src"]);
  });

  it("sets a CSS drop-shadow() filter fallback matching the params", () => {
    const nodes = createDropShadowChain("shadow", createEffectNodeId("src"), params);
    expect(nodes.at(-1)?.cssFilter).toBe("drop-shadow(4px 6px 8px rgba(0, 0, 0, 0.5))");
  });
});
