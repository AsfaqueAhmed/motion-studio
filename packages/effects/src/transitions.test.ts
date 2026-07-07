import { createEffectNodeId, EffectType, TransitionType } from "@motion-studio/shared";
import { describe, expect, it } from "vitest";
import { createTransitionNode } from "./transitions";

describe("createTransitionNode", () => {
  it("takes two dependencies in [from, to] order", () => {
    const node = createTransitionNode(
      createEffectNodeId("t"),
      createEffectNodeId("from"),
      createEffectNodeId("to"),
      TransitionType.CrossDissolve,
      0.5,
    );
    expect(node.type).toBe(EffectType.Transition);
    expect(node.dependencyIds).toEqual(["from", "to"]);
  });

  it("has no CSS filter fallback", () => {
    const node = createTransitionNode(
      createEffectNodeId("t"),
      createEffectNodeId("from"),
      createEffectNodeId("to"),
      TransitionType.CrossDissolve,
      0.5,
    );
    expect(node.cssFilter).toBeUndefined();
  });

  it("generates a mix() body for CrossDissolve", () => {
    const node = createTransitionNode(
      createEffectNodeId("t"),
      createEffectNodeId("from"),
      createEffectNodeId("to"),
      TransitionType.CrossDissolve,
      0.5,
    );
    expect(node.wgsl).toContain("mix(fromColor, toColor, kProgress)");
    expect(node.glsl).toContain("mix(fromColor, toColor, kProgress)");
  });

  it.each([
    [TransitionType.WipeLeft, "uv.x > 1.0 - kProgress"],
    [TransitionType.WipeRight, "uv.x < kProgress"],
    [TransitionType.WipeUp, "uv.y > 1.0 - kProgress"],
    [TransitionType.WipeDown, "uv.y < kProgress"],
  ])("generates a spatial condition for %s", (type, condition) => {
    const node = createTransitionNode(
      createEffectNodeId("t"),
      createEffectNodeId("from"),
      createEffectNodeId("to"),
      type,
      0.3,
    );
    expect(node.wgsl).toContain(condition);
    expect(node.glsl).toContain(condition);
  });

  it("rejects progress outside [0, 1]", () => {
    expect(() =>
      createTransitionNode(
        createEffectNodeId("t"),
        createEffectNodeId("from"),
        createEffectNodeId("to"),
        TransitionType.CrossDissolve,
        1.5,
      ),
    ).toThrow();
  });
});
