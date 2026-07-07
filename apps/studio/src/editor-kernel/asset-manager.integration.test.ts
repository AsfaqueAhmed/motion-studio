import { AssetCatalog, AssetManager } from "@motion-studio/assets";
import { AssetBlobStore, StorageEngine } from "@motion-studio/storage";
import { describe, expect, it } from "vitest";
import { AssetCatalogRepository } from "./asset-catalog-repository";
import { browserMetadataExtractor } from "./metadata-extractor";

/**
 * PLAN.md 16.2 "Asset import → catalog → dedup" — the real wiring
 * `create-editor-kernel.ts` uses (StorageEngine -> AssetBlobStore backed by
 * real OPFS, AssetCatalogRepository backed by real IndexedDB), run against
 * an actual Chromium instead of the fakes `asset-manager.test.ts` (unit
 * tier, in @motion-studio/assets) uses. `browserMetadataExtractor` is also
 * real here — `createImageBitmap` is a genuine browser API, not stubbed.
 */
function freshAssetManager(): AssetManager {
  const storage = new StorageEngine();
  return new AssetManager({
    blobStore: new AssetBlobStore(storage),
    catalog: new AssetCatalog(new AssetCatalogRepository(storage)),
    metadataExtractor: browserMetadataExtractor,
  });
}

// A real, decodable 2x2 opaque-red PNG (generated via Pillow) so
// `createImageBitmap` (used by `browserMetadataExtractor`) succeeds instead
// of throwing — a hand-rolled minimal PNG byte sequence turned out not to
// round-trip through every decoder correctly.
const TWO_BY_TWO_RED_PNG_BASE64 =
  "iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAYAAABytg0kAAAAFUlEQVR4nGP8z8Dwn4GBgYEJRIAwAB8XAgICR7MUAAAAAElFTkSuQmCC";

function testImageBytes(): Uint8Array {
  const binary = atob(TWO_BY_TWO_RED_PNG_BASE64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

describe("AssetManager against real OPFS + real IndexedDB", () => {
  it("imports an asset, persisting it to the real catalog with real image metadata", async () => {
    const assetManager = freshAssetManager();

    const entry = await assetManager.import({
      fileName: `photo-${crypto.randomUUID()}.png`,
      mimeType: "image/png",
      data: testImageBytes(),
    });

    expect(entry.sizeBytes).toBe(testImageBytes().byteLength);

    const listed = await assetManager.list();
    expect(listed.map((item) => item.id)).toContain(entry.id);
  });

  it("dedups by content hash — importing identical bytes twice yields one real catalog entry", async () => {
    const assetManager = freshAssetManager();
    const data = testImageBytes();

    const first = await assetManager.import({ fileName: "a.png", mimeType: "image/png", data });
    const second = await assetManager.import({ fileName: "b.png", mimeType: "image/png", data });

    expect(second.id).toBe(first.id);
    const listed = await assetManager.list();
    expect(listed.filter((item) => item.id === first.id)).toHaveLength(1);
  });

  it("dedup survives a fresh AssetManager instance reading from the same real storage", async () => {
    const first = await freshAssetManager().import({
      fileName: "shared.png",
      mimeType: "image/png",
      data: testImageBytes(),
    });

    // New instance -> new StorageEngine/AssetBlobStore/AssetCatalogRepository,
    // same underlying real IndexedDB/OPFS -> proves persistence, not an
    // in-memory cache on the first AssetManager.
    const second = await freshAssetManager().import({
      fileName: "shared-again.png",
      mimeType: "image/png",
      data: testImageBytes(),
    });

    expect(second.id).toBe(first.id);
  });
});
