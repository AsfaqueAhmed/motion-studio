import { createAssetId } from "@motion-studio/shared";
import { AssetCatalog, AssetDependencyGraph, AssetManager } from "@motion-studio/assets";
import { describe, expect, it } from "vitest";
import { RegisterAssetReferenceCommand } from "./register-asset-reference-command";

function setup() {
  const dependencyGraph = new AssetDependencyGraph();
  const catalog = new AssetCatalog({
    create: async () => undefined,
    get: async () => undefined,
    delete: async () => undefined,
    list: async () => [],
  });
  const assetManager = new AssetManager({
    blobStore: {
      put: () => Promise.resolve("hash"),
      get: () => Promise.resolve(undefined),
      has: () => Promise.resolve(false),
      delete: () => Promise.resolve(),
    },
    catalog,
    metadataExtractor: { extract: () => Promise.reject(new Error("not used")) },
    dependencyGraph,
  });
  const assetId = createAssetId("asset-1");
  return { assetManager, dependencyGraph, assetId };
}

describe("RegisterAssetReferenceCommand", () => {
  it("execute registers the reference; undo unregisters it; redo re-registers it", () => {
    const { assetManager, dependencyGraph, assetId } = setup();
    const command = new RegisterAssetReferenceCommand("cmd-1", assetManager, assetId, "clip-1");

    command.execute();
    expect(dependencyGraph.getReferences(assetId)).toEqual(["clip-1"]);
    expect(dependencyGraph.isUnused(assetId)).toBe(false);

    command.undo();
    expect(dependencyGraph.getReferences(assetId)).toEqual([]);
    expect(dependencyGraph.isUnused(assetId)).toBe(true);

    command.redo();
    expect(dependencyGraph.getReferences(assetId)).toEqual(["clip-1"]);
  });
});
