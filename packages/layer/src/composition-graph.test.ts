import { createLayerId } from "@motion-studio/shared";
import { describe, expect, it } from "vitest";
import { CompositionGraph } from "./composition-graph";
import { createGroupLayer, createShapeLayer } from "./layer-factory";
import { LayerRegistry } from "./layer-registry";

function setup() {
  const registry = new LayerRegistry();
  const graph = new CompositionGraph(registry);
  return { registry, graph };
}

describe("CompositionGraph", () => {
  it("addLayer attaches a child to its Group parent's childIds", () => {
    const { registry, graph } = setup();
    const group = createGroupLayer({ id: createLayerId("group"), name: "Group" });
    graph.addLayer(group);
    const child = createShapeLayer({
      id: createLayerId("child"),
      name: "Box",
      parentId: group.id,
    });
    graph.addLayer(child);

    expect(graph.getChildren(group.id)).toEqual([child.id]);
    expect(graph.getParent(child.id)).toBe(group.id);
    expect(registry.get(group.id)).toBe(group);
  });

  it("addLayer rejects a parent that is not a Group layer", () => {
    const { graph } = setup();
    const leaf = createShapeLayer({ id: createLayerId("leaf"), name: "Box" });
    graph.addLayer(leaf);
    const child = createShapeLayer({
      id: createLayerId("child"),
      name: "Circle",
      parentId: leaf.id,
    });
    expect(() => graph.addLayer(child)).toThrow(/not a Group layer/);
  });

  it("getAncestors and getDescendants walk multi-level nesting", () => {
    const { graph } = setup();
    const root = createGroupLayer({ id: createLayerId("root"), name: "Root" });
    const mid = createGroupLayer({ id: createLayerId("mid"), name: "Mid", parentId: root.id });
    const leaf = createShapeLayer({ id: createLayerId("leaf"), name: "Leaf", parentId: mid.id });
    graph.addLayer(root);
    graph.addLayer(mid);
    graph.addLayer(leaf);

    expect(graph.getAncestors(leaf.id)).toEqual([mid.id, root.id]);
    expect(new Set(graph.getDescendants(root.id))).toEqual(new Set([mid.id, leaf.id]));
  });

  it("reparent moves a layer between groups and updates both childIds arrays", () => {
    const { graph } = setup();
    const groupA = createGroupLayer({ id: createLayerId("a"), name: "A" });
    const groupB = createGroupLayer({ id: createLayerId("b"), name: "B" });
    const child = createShapeLayer({ id: createLayerId("child"), name: "C", parentId: groupA.id });
    graph.addLayer(groupA);
    graph.addLayer(groupB);
    graph.addLayer(child);

    graph.reparent(child.id, groupB.id);

    expect(graph.getChildren(groupA.id)).toEqual([]);
    expect(graph.getChildren(groupB.id)).toEqual([child.id]);
    expect(graph.getParent(child.id)).toBe(groupB.id);
  });

  it("reparent to null detaches a layer to the root", () => {
    const { graph } = setup();
    const group = createGroupLayer({ id: createLayerId("group"), name: "Group" });
    const child = createShapeLayer({ id: createLayerId("child"), name: "C", parentId: group.id });
    graph.addLayer(group);
    graph.addLayer(child);

    graph.reparent(child.id, null);

    expect(graph.getChildren(group.id)).toEqual([]);
    expect(graph.getParent(child.id)).toBeNull();
  });

  it("reparent rejects creating a cycle", () => {
    const { graph } = setup();
    const root = createGroupLayer({ id: createLayerId("root"), name: "Root" });
    const mid = createGroupLayer({ id: createLayerId("mid"), name: "Mid", parentId: root.id });
    graph.addLayer(root);
    graph.addLayer(mid);

    expect(() => graph.reparent(root.id, mid.id)).toThrow(/cycle/);
  });

  it("reparent rejects a non-Group new parent", () => {
    const { graph } = setup();
    const leaf = createShapeLayer({ id: createLayerId("leaf"), name: "Leaf" });
    const other = createShapeLayer({ id: createLayerId("other"), name: "Other" });
    graph.addLayer(leaf);
    graph.addLayer(other);

    expect(() => graph.reparent(other.id, leaf.id)).toThrow(/not a Group layer/);
  });

  it("isEffectivelyVisible is false if any ancestor is hidden", () => {
    const { graph } = setup();
    const root = createGroupLayer({ id: createLayerId("root"), name: "Root", visible: false });
    const child = createShapeLayer({ id: createLayerId("child"), name: "C", parentId: root.id });
    graph.addLayer(root);
    graph.addLayer(child);

    expect(graph.isEffectivelyVisible(child.id)).toBe(false);
    expect(graph.isEffectivelyVisible(root.id)).toBe(false);
  });

  it("isEffectivelyLocked is true if any ancestor is locked", () => {
    const { graph } = setup();
    const root = createGroupLayer({ id: createLayerId("root"), name: "Root", locked: true });
    const child = createShapeLayer({ id: createLayerId("child"), name: "C", parentId: root.id });
    graph.addLayer(root);
    graph.addLayer(child);

    expect(graph.isEffectivelyLocked(child.id)).toBe(true);
  });

  it("removeLayer removes a childless leaf and detaches it from its parent", () => {
    const { graph, registry } = setup();
    const group = createGroupLayer({ id: createLayerId("group"), name: "Group" });
    const child = createShapeLayer({ id: createLayerId("child"), name: "C", parentId: group.id });
    graph.addLayer(group);
    graph.addLayer(child);

    graph.removeLayer(child.id);

    expect(registry.has(child.id)).toBe(false);
    expect(graph.getChildren(group.id)).toEqual([]);
  });

  it("removeLayer throws if the layer still has children", () => {
    const { graph } = setup();
    const group = createGroupLayer({ id: createLayerId("group"), name: "Group" });
    const child = createShapeLayer({ id: createLayerId("child"), name: "C", parentId: group.id });
    graph.addLayer(group);
    graph.addLayer(child);

    expect(() => graph.removeLayer(group.id)).toThrow(/still has children/);
  });
});
