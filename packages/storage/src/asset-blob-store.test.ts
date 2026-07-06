import { beforeEach, describe, expect, it } from "vitest";
import { AssetBlobStore, hashContent } from "./asset-blob-store";
import { createInMemoryVfs } from "./test-support/in-memory-vfs";
import type { IVFS } from "./vfs";

describe("AssetBlobStore", () => {
  let vfs: IVFS;
  let store: AssetBlobStore;

  beforeEach(() => {
    vfs = createInMemoryVfs();
    store = new AssetBlobStore(vfs);
  });

  it("hashContent is deterministic for the same bytes", async () => {
    const data = new TextEncoder().encode("hello world");

    expect(await hashContent(data)).toBe(await hashContent(data));
  });

  it("hashContent differs for different bytes", async () => {
    const a = await hashContent(new TextEncoder().encode("a"));
    const b = await hashContent(new TextEncoder().encode("b"));

    expect(a).not.toBe(b);
  });

  it("put() stores the blob under its content hash and get() retrieves it", async () => {
    const data = new TextEncoder().encode("video bytes");

    const hash = await store.put(data);
    const result = await store.get(hash);

    expect(result).toEqual(data);
    expect(hash).toBe(await hashContent(data));
  });

  it("put() with the same content twice does not write a second time (dedup)", async () => {
    const data = new TextEncoder().encode("dedup me");
    let writeCount = 0;
    const countingVfs: IVFS = {
      ...vfs,
      write: (path, bytes) => {
        writeCount += 1;
        return vfs.write(path, bytes);
      },
    };
    store = new AssetBlobStore(countingVfs);

    const first = await store.put(data);
    const second = await store.put(data);

    expect(first).toBe(second);
    expect(writeCount).toBe(1);
  });

  it("has()/delete() reflect presence of the blob", async () => {
    const hash = await store.put(new TextEncoder().encode("x"));

    await expect(store.has(hash)).resolves.toBe(true);
    await store.delete(hash);
    await expect(store.has(hash)).resolves.toBe(false);
  });
});
