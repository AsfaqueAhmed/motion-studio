import { describe, expect, it } from "vitest";
import { DirtyTrackedGraph, type IBounds } from "./dirty-graph";

interface FakeNode {
  parentId: string | null;
  children: string[];
  bounds: IBounds;
  visible: boolean;
}

function buildGraph(nodes: Record<string, FakeNode>) {
  return new DirtyTrackedGraph<string>({
    getParentId: (id) => nodes[id]?.parentId ?? null,
    getChildIds: (id) => nodes[id]?.children ?? [],
    getBounds: (id) => nodes[id]!.bounds,
    isVisible: (id) => nodes[id]?.visible ?? false,
  });
}

const rect = (x: number, y: number, w: number, h: number): IBounds => ({
  x,
  y,
  width: w,
  height: h,
});

describe("DirtyTrackedGraph", () => {
  it("marks a node dirty without affecting siblings", () => {
    const graph = buildGraph({
      root: { parentId: null, children: ["a", "b"], bounds: rect(0, 0, 10, 10), visible: true },
      a: { parentId: "root", children: [], bounds: rect(0, 0, 5, 5), visible: true },
      b: { parentId: "root", children: [], bounds: rect(5, 5, 5, 5), visible: true },
    });
    graph.markDirty("a");
    expect(graph.isDirty("a")).toBe(true);
    expect(graph.isDirty("b")).toBe(false);
  });

  it("cascades dirty marking to all descendants", () => {
    const graph = buildGraph({
      root: { parentId: null, children: ["mid"], bounds: rect(0, 0, 10, 10), visible: true },
      mid: { parentId: "root", children: ["leaf"], bounds: rect(0, 0, 10, 10), visible: true },
      leaf: { parentId: "mid", children: [], bounds: rect(0, 0, 10, 10), visible: true },
    });
    graph.markDirty("root");
    expect(graph.isDirty("root")).toBe(true);
    expect(graph.isDirty("mid")).toBe(true);
    expect(graph.isDirty("leaf")).toBe(true);
  });

  it("clearDirty and clearAll remove dirty flags", () => {
    const graph = buildGraph({
      a: { parentId: null, children: [], bounds: rect(0, 0, 1, 1), visible: true },
      b: { parentId: null, children: [], bounds: rect(0, 0, 1, 1), visible: true },
    });
    graph.markDirty("a");
    graph.markDirty("b");
    graph.clearDirty("a");
    expect(graph.isDirty("a")).toBe(false);
    expect(graph.isDirty("b")).toBe(true);
    graph.clearAll();
    expect(graph.isDirty("b")).toBe(false);
    expect(graph.dirtyCount).toBe(0);
  });

  it("queryVisible returns only visible nodes intersecting the viewport", () => {
    const graph = buildGraph({
      inView: { parentId: null, children: [], bounds: rect(0, 0, 10, 10), visible: true },
      outOfView: { parentId: null, children: [], bounds: rect(1000, 1000, 10, 10), visible: true },
      hidden: { parentId: null, children: [], bounds: rect(0, 0, 10, 10), visible: false },
    });
    const viewport = rect(0, 0, 100, 100);
    expect(graph.queryVisible(["inView", "outOfView", "hidden"], viewport)).toEqual(["inView"]);
  });

  it("queryDirtyVisible intersects visibility and dirtiness", () => {
    const graph = buildGraph({
      a: { parentId: null, children: [], bounds: rect(0, 0, 10, 10), visible: true },
      b: { parentId: null, children: [], bounds: rect(0, 0, 10, 10), visible: true },
    });
    graph.markDirty("a");
    const viewport = rect(0, 0, 100, 100);
    expect(graph.queryDirtyVisible(["a", "b"], viewport)).toEqual(["a"]);
  });
});
