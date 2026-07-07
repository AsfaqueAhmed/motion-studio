import { createAssetId } from "@motion-studio/shared";
import { describe, expect, it } from "vitest";
import { AssetDependencyGraph } from "./dependency-graph";

describe("AssetDependencyGraph", () => {
  it("an asset with no references is unused", () => {
    const graph = new AssetDependencyGraph();
    const assetId = createAssetId("a");

    expect(graph.isUnused(assetId)).toBe(true);
    expect(graph.getReferences(assetId)).toEqual([]);
  });

  it("registering a reference makes the asset used and traceable both ways", () => {
    const graph = new AssetDependencyGraph();
    const assetId = createAssetId("a");

    graph.registerReference(assetId, "trackItem-1");

    expect(graph.isUnused(assetId)).toBe(false);
    expect(graph.getReferences(assetId)).toEqual(["trackItem-1"]);
    expect(graph.getAssetFor("trackItem-1")).toBe(assetId);
  });

  it("supports multiple references to the same asset", () => {
    const graph = new AssetDependencyGraph();
    const assetId = createAssetId("a");

    graph.registerReference(assetId, "trackItem-1");
    graph.registerReference(assetId, "trackItem-2");

    expect(graph.getReferences(assetId).sort()).toEqual(["trackItem-1", "trackItem-2"]);
  });

  it("unregistering a reference frees the asset once no references remain", () => {
    const graph = new AssetDependencyGraph();
    const assetId = createAssetId("a");
    graph.registerReference(assetId, "trackItem-1");

    graph.unregisterReference("trackItem-1");

    expect(graph.isUnused(assetId)).toBe(true);
    expect(graph.getAssetFor("trackItem-1")).toBeUndefined();
  });

  it("listUnused returns only assets with zero incoming references", () => {
    const graph = new AssetDependencyGraph();
    const used = createAssetId("used");
    const unused = createAssetId("unused");
    graph.registerReference(used, "trackItem-1");

    expect(graph.listUnused([used, unused])).toEqual([unused]);
  });
});
