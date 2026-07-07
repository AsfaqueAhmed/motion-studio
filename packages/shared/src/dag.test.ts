import { describe, expect, it } from "vitest";
import { Dag, DagCycleError } from "./dag";

function buildDag(edges: Record<string, string[]>) {
  return new Dag<string>({
    getDependencyIds: (id) => edges[id] ?? [],
  });
}

describe("Dag", () => {
  it("orders dependencies before dependents", () => {
    // image -> blur -> shadow -> output (Render Graph shaped example)
    const dag = buildDag({ output: ["shadow"], shadow: ["blur"], blur: ["image"], image: [] });
    expect(dag.topologicalOrder(["output"])).toEqual(["image", "blur", "shadow", "output"]);
  });

  it("dedupes shared dependencies visited via multiple branches", () => {
    // diamond: output depends on left and right, both depend on image
    const dag = buildDag({
      output: ["left", "right"],
      left: ["image"],
      right: ["image"],
      image: [],
    });
    const order = dag.topologicalOrder(["output"]);
    expect(order.indexOf("image")).toBeLessThan(order.indexOf("left"));
    expect(order.indexOf("image")).toBeLessThan(order.indexOf("right"));
    expect(order.filter((id) => id === "image")).toHaveLength(1);
    expect(order.at(-1)).toBe("output");
  });

  it("throws DagCycleError for a direct cycle", () => {
    const dag = buildDag({ a: ["b"], b: ["a"] });
    expect(() => dag.topologicalOrder(["a"])).toThrow(DagCycleError);
  });

  it("throws DagCycleError for a node depending on itself", () => {
    const dag = buildDag({ a: ["a"] });
    expect(() => dag.topologicalOrder(["a"])).toThrow(/cycle/);
  });

  it("hasCycle returns false for an acyclic graph and true for a cyclic one", () => {
    expect(buildDag({ a: ["b"], b: [] }).hasCycle(["a"])).toBe(false);
    expect(buildDag({ a: ["b"], b: ["a"] }).hasCycle(["a"])).toBe(true);
  });

  it("handles multiple independent roots", () => {
    const dag = buildDag({ a: [], b: [], c: ["a", "b"] });
    const order = dag.topologicalOrder(["c", "a"]);
    expect(order).toContain("a");
    expect(order).toContain("b");
    expect(order.indexOf("a")).toBeLessThan(order.indexOf("c"));
    expect(order.indexOf("b")).toBeLessThan(order.indexOf("c"));
  });
});
