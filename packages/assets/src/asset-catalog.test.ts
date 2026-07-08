import { AssetType, createAssetId } from "@motion-studio/shared";
import { describe, expect, it } from "vitest";
import { AssetCatalog, type IAssetCatalogEntry } from "./asset-catalog";
import { FakeAssetCatalogStore } from "./test-support/fakes";

function makeEntry(id: string): IAssetCatalogEntry {
  return {
    id: createAssetId(id),
    name: `asset-${id}`,
    type: AssetType.Image,
    mimeType: "image/png",
    sizeBytes: 1024,
    durationTicks: undefined,
    width: undefined,
    height: undefined,
    contentHash: id,
    tags: [],
    createdAt: 0,
  };
}

describe("AssetCatalog", () => {
  it("registers and retrieves an entry", async () => {
    const catalog = new AssetCatalog(new FakeAssetCatalogStore());
    const entry = makeEntry("a");

    await catalog.register(entry);

    expect(await catalog.get(entry.id)).toEqual(entry);
  });

  it("lists all registered entries", async () => {
    const catalog = new AssetCatalog(new FakeAssetCatalogStore());
    await catalog.register(makeEntry("a"));
    await catalog.register(makeEntry("b"));

    const all = await catalog.list();

    expect(all.map((entry) => entry.id).sort()).toEqual(["a", "b"]);
  });

  it("removes an entry", async () => {
    const catalog = new AssetCatalog(new FakeAssetCatalogStore());
    const entry = makeEntry("a");
    await catalog.register(entry);

    await catalog.remove(entry.id);

    expect(await catalog.get(entry.id)).toBeUndefined();
  });
});
