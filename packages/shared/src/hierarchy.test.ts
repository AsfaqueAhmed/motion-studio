import { describe, expect, it } from "vitest";
import { Hierarchy } from "./hierarchy";

/** Minimal in-memory tree used only to exercise the accessor contract. */
function buildTree(edges: Record<string, string | null>) {
  const parents = new Map<string, string | null>(Object.entries(edges));
  const children = new Map<string, string[]>();
  for (const [id, parentId] of parents) {
    if (!children.has(id)) children.set(id, []);
    if (parentId !== null) {
      children.set(parentId, [...(children.get(parentId) ?? []), id]);
    }
  }
  return new Hierarchy<string>({
    getParentId: (id) => parents.get(id) ?? null,
    getChildIds: (id) => children.get(id) ?? [],
  });
}

describe("Hierarchy", () => {
  it("walks ancestors from leaf to root", () => {
    const hierarchy = buildTree({ root: null, mid: "root", leaf: "mid" });
    expect(hierarchy.getAncestors("leaf")).toEqual(["mid", "root"]);
    expect(hierarchy.getAncestors("root")).toEqual([]);
  });

  it("walks all descendants regardless of depth", () => {
    const hierarchy = buildTree({
      root: null,
      a: "root",
      b: "root",
      a1: "a",
    });
    expect(new Set(hierarchy.getDescendants("root"))).toEqual(new Set(["a", "b", "a1"]));
    expect(hierarchy.getDescendants("b")).toEqual([]);
  });

  it("isDescendantOf reflects transitive ancestry", () => {
    const hierarchy = buildTree({ root: null, mid: "root", leaf: "mid" });
    expect(hierarchy.isDescendantOf("leaf", "root")).toBe(true);
    expect(hierarchy.isDescendantOf("mid", "leaf")).toBe(false);
  });

  it("assertNoCycle allows detaching to root", () => {
    const hierarchy = buildTree({ root: null, mid: "root" });
    expect(() => hierarchy.assertNoCycle("mid", null)).not.toThrow();
  });

  it("assertNoCycle rejects parenting a node under itself", () => {
    const hierarchy = buildTree({ root: null });
    expect(() => hierarchy.assertNoCycle("root", "root")).toThrow(/cycle/);
  });

  it("assertNoCycle rejects parenting a node under its own descendant", () => {
    const hierarchy = buildTree({ root: null, mid: "root", leaf: "mid" });
    expect(() => hierarchy.assertNoCycle("root", "leaf")).toThrow(/cycle/);
  });
});
