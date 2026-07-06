import { createAssetId, toTick } from "@motion-studio/shared";
import { beforeEach, describe, expect, it } from "vitest";
import { ThumbnailCache } from "./thumbnail-cache";
import { createInMemoryVfs } from "./test-support/in-memory-vfs";

describe("ThumbnailCache", () => {
  let cache: ThumbnailCache;

  beforeEach(() => {
    cache = new ThumbnailCache(createInMemoryVfs());
  });

  it("get() returns undefined for a thumbnail that was never put", async () => {
    const assetId = createAssetId("asset1");
    await expect(cache.get(assetId, toTick(0))).resolves.toBeUndefined();
  });

  it("put() then get() round-trips the image bytes", async () => {
    const assetId = createAssetId("asset1");
    const data = new Uint8Array([1, 2, 3]);
    await cache.put(assetId, toTick(30), data);

    await expect(cache.get(assetId, toTick(30))).resolves.toEqual(data);
    await expect(cache.has(assetId, toTick(30))).resolves.toBe(true);
  });

  it("listTicks() returns every tick with a thumbnail for that asset only", async () => {
    const assetA = createAssetId("assetA");
    const assetB = createAssetId("assetB");
    await cache.put(assetA, toTick(0), new Uint8Array([1]));
    await cache.put(assetA, toTick(30), new Uint8Array([2]));
    await cache.put(assetB, toTick(0), new Uint8Array([3]));

    const ticks = await cache.listTicks(assetA);

    expect(ticks.sort((a, b) => a - b)).toEqual([0, 30]);
  });

  it("deleteAllForAsset() removes every thumbnail for that asset", async () => {
    const assetId = createAssetId("asset1");
    await cache.put(assetId, toTick(0), new Uint8Array([1]));
    await cache.put(assetId, toTick(30), new Uint8Array([2]));

    await cache.deleteAllForAsset(assetId);

    expect(await cache.listTicks(assetId)).toEqual([]);
  });
});
