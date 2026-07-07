import { DagCycleError, createEffectNodeId } from "@motion-studio/shared";
import { describe, expect, it } from "vitest";
import { orderEffectChain } from "./effect-chain";
import type { IEffectNode } from "./effect-node";
import { EffectType } from "@motion-studio/shared";

function node(id: string, dependencyIds: string[]): IEffectNode {
  return {
    id: createEffectNodeId(id),
    type: EffectType.GaussianBlur,
    dependencyIds: dependencyIds.map(createEffectNodeId),
    wgsl: "",
    glsl: "",
  };
}

describe("orderEffectChain", () => {
  it("orders a linear chain dependency-first", () => {
    const nodes = [node("source", []), node("blur", ["source"]), node("output", ["blur"])];
    const order = orderEffectChain(nodes, createEffectNodeId("output"));
    expect(order.map((n) => n.id)).toEqual(["source", "blur", "output"]);
  });

  it("orders a two-input chain (e.g. blend) with both dependencies before the consumer", () => {
    const nodes = [node("bottom", []), node("top", []), node("blend", ["bottom", "top"])];
    const order = orderEffectChain(nodes, createEffectNodeId("blend"));
    expect(order.map((n) => n.id)).toEqual(["bottom", "top", "blend"]);
  });

  it("throws DagCycleError for a cyclic chain", () => {
    const nodes = [node("a", ["b"]), node("b", ["a"])];
    expect(() => orderEffectChain(nodes, createEffectNodeId("a"))).toThrow(DagCycleError);
  });

  it("throws if the output id isn't registered", () => {
    expect(() => orderEffectChain([], createEffectNodeId("missing"))).toThrow();
  });
});
