import { AssetType, createAssetId } from "@motion-studio/shared";
import {
  AssetCatalog,
  AssetManager,
  type IAssetCatalogEntry,
  type IMetadataExtractor,
} from "@motion-studio/assets";
import { describe, expect, it } from "vitest";
import { AssetEditorService } from "./asset-editor-service";

function fakeAssetManager() {
  const entries = new Map<string, IAssetCatalogEntry>();
  const metadataExtractor: IMetadataExtractor = {
    extract: () => Promise.resolve({ type: AssetType.Image, width: 1, height: 1 }),
  };
  const catalog = new AssetCatalog({
    create: async (entry) => void entries.set(entry.id, entry),
    get: async (id) => entries.get(id),
    delete: async (id) => void entries.delete(id),
    list: async () => Array.from(entries.values()),
  });
  const thumbnails = new Map<string, Uint8Array>();
  const assetManager = new AssetManager({
    blobStore: {
      put: () => Promise.resolve("hash-1"),
      get: () => Promise.resolve(undefined),
      has: () => Promise.resolve(false),
      delete: () => Promise.resolve(),
    },
    catalog,
    metadataExtractor,
    thumbnailGenerator: {
      generate: () => Promise.resolve(new Uint8Array([1, 2, 3])),
    },
    thumbnailStore: {
      put: async (assetId, _atTick, data) => void thumbnails.set(assetId, data),
      get: async (assetId) => thumbnails.get(assetId),
      deleteAllForAsset: async (assetId) => void thumbnails.delete(assetId),
    },
  });
  return assetManager;
}

describe("AssetEditorService", () => {
  it("imports a file and lists it back", async () => {
    const service = new AssetEditorService(fakeAssetManager());

    const entry = await service.import({
      fileName: "photo.png",
      mimeType: "image/png",
      data: new Uint8Array([1, 2, 3]),
    });
    const list = await service.list();

    expect(list).toEqual([entry]);
  });

  it("deletes an asset", async () => {
    const service = new AssetEditorService(fakeAssetManager());
    const entry = await service.import({
      fileName: "photo.png",
      mimeType: "image/png",
      data: new Uint8Array([1, 2, 3]),
    });

    await service.delete(createAssetId(entry.id));

    expect(await service.list()).toEqual([]);
  });

  it("returns the thumbnail generated at import", async () => {
    const service = new AssetEditorService(fakeAssetManager());
    const entry = await service.import({
      fileName: "photo.png",
      mimeType: "image/png",
      data: new Uint8Array([1, 2, 3]),
    });

    expect(await service.getThumbnail(createAssetId(entry.id))).toEqual(new Uint8Array([1, 2, 3]));
  });
});
