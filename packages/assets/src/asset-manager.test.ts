import { AssetType, createAssetId } from "@motion-studio/shared";
import { describe, expect, it } from "vitest";
import { AssetCatalog } from "./asset-catalog";
import { AssetManager } from "./asset-manager";
import {
  FakeAssetBlobStore,
  FakeAssetCatalogStore,
  FakeAssetEventSink,
  FakeMetadataExtractor,
  FakeThumbnailStore,
  FakeWaveformStore,
} from "./test-support/fakes";

function makeManager(): { manager: AssetManager; events: FakeAssetEventSink } {
  const events = new FakeAssetEventSink();
  const manager = new AssetManager({
    blobStore: new FakeAssetBlobStore(),
    catalog: new AssetCatalog(new FakeAssetCatalogStore()),
    metadataExtractor: new FakeMetadataExtractor(
      () => ({ type: AssetType.Image, width: 1, height: 1 }) as never,
    ),
    thumbnailStore: new FakeThumbnailStore(),
    waveformStore: new FakeWaveformStore(),
    events,
  });
  return { manager, events };
}

describe("AssetManager", () => {
  it("imports an asset and makes it retrievable via get()/list()", async () => {
    const { manager } = makeManager();

    const entry = await manager.import({
      fileName: "photo.png",
      mimeType: "image/png",
      data: new Uint8Array([1, 2, 3]),
    });

    expect(await manager.get(entry.id)).toEqual(entry);
    expect(await manager.list()).toEqual([entry]);
  });

  it("delete() throws when the asset is still referenced", async () => {
    const { manager } = makeManager();
    const entry = await manager.import({
      fileName: "photo.png",
      mimeType: "image/png",
      data: new Uint8Array([1]),
    });
    manager.registerReference(entry.id, "trackItem-1");

    await expect(manager.delete(entry.id)).rejects.toThrow(/still referenced/);
    expect(await manager.get(entry.id)).toEqual(entry);
  });

  it("delete({ force: true }) removes an asset even if referenced", async () => {
    const { manager, events } = makeManager();
    const entry = await manager.import({
      fileName: "photo.png",
      mimeType: "image/png",
      data: new Uint8Array([1]),
    });
    manager.registerReference(entry.id, "trackItem-1");

    await manager.delete(entry.id, { force: true });

    expect(await manager.get(entry.id)).toBeUndefined();
    expect(events.events).toContainEqual({ type: "AssetDeleted", payload: { assetId: entry.id } });
  });

  it("delete() succeeds without force once no references remain", async () => {
    const { manager } = makeManager();
    const entry = await manager.import({
      fileName: "photo.png",
      mimeType: "image/png",
      data: new Uint8Array([1]),
    });
    manager.registerReference(entry.id, "trackItem-1");
    manager.unregisterReference("trackItem-1");

    await manager.delete(entry.id);

    expect(await manager.get(entry.id)).toBeUndefined();
  });

  it("listUnused() returns only assets with zero incoming references", async () => {
    const { manager } = makeManager();
    const used = await manager.import({
      fileName: "used.png",
      mimeType: "image/png",
      data: new Uint8Array([1]),
    });
    const unused = await manager.import({
      fileName: "unused.png",
      mimeType: "image/png",
      data: new Uint8Array([2]),
    });
    manager.registerReference(used.id, "trackItem-1");

    const unusedList = await manager.listUnused();

    expect(unusedList.map((entry) => entry.id)).toEqual([unused.id]);
  });

  it("delete() of an unknown asset is a no-op that still emits AssetDeleted", async () => {
    const { manager, events } = makeManager();
    const unknownId = createAssetId("does-not-exist");

    await manager.delete(unknownId);

    expect(events.events).toContainEqual({ type: "AssetDeleted", payload: { assetId: unknownId } });
  });
});
