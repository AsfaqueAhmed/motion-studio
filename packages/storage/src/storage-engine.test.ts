import { describe, expect, it, vi } from "vitest";
import type { IStorageAdapter } from "./storage-adapter";
import { StorageEngine } from "./storage-engine";

function fakeAdapter(): IStorageAdapter {
  return {
    read: vi.fn().mockResolvedValue(undefined),
    write: vi.fn().mockResolvedValue(undefined),
    delete: vi.fn().mockResolvedValue(undefined),
    exists: vi.fn().mockResolvedValue(false),
    list: vi.fn().mockResolvedValue([]),
  };
}

describe("StorageEngine", () => {
  it("has the canonical engine name and a no-op lifecycle", () => {
    const engine = new StorageEngine();
    expect(engine.name).toBe("Storage");
    expect(engine.initialize()).toBeUndefined();
    expect(engine.ready()).toBeUndefined();
    expect(engine.dispose()).toBeUndefined();
  });

  it("routes structured-data directories to the IndexedDB adapter", async () => {
    const indexedDb = fakeAdapter();
    const opfs = fakeAdapter();
    const engine = new StorageEngine({ indexedDb, opfs });

    await engine.write("projects/abc.json", new Uint8Array([1]));
    await engine.read("settings/theme");
    await engine.list("thumbnails/asset1/");

    expect(indexedDb.write).toHaveBeenCalledWith("projects/abc.json", new Uint8Array([1]));
    expect(indexedDb.read).toHaveBeenCalledWith("settings/theme");
    expect(indexedDb.list).toHaveBeenCalledWith("thumbnails/asset1/");
    expect(opfs.write).not.toHaveBeenCalled();
  });

  it("routes large-binary directories to the OPFS adapter", async () => {
    const indexedDb = fakeAdapter();
    const opfs = fakeAdapter();
    const engine = new StorageEngine({ indexedDb, opfs });

    await engine.write("assets/deadbeef", new Uint8Array([1]));
    await engine.exists("models/kokoro/weights.bin");
    await engine.delete("exports/job1.mp4");

    expect(opfs.write).toHaveBeenCalledWith("assets/deadbeef", new Uint8Array([1]));
    expect(opfs.exists).toHaveBeenCalledWith("models/kokoro/weights.bin");
    expect(opfs.delete).toHaveBeenCalledWith("exports/job1.mp4");
    expect(indexedDb.write).not.toHaveBeenCalled();
  });

  it("throws for a path whose top-level directory has no registered backend", async () => {
    const engine = new StorageEngine({ indexedDb: fakeAdapter(), opfs: fakeAdapter() });

    await expect(engine.read("unknown/thing")).rejects.toThrow(/No storage backend registered/);
  });

  it("throws for a path with no top-level directory", async () => {
    const engine = new StorageEngine({ indexedDb: fakeAdapter(), opfs: fakeAdapter() });

    await expect(engine.read("")).rejects.toThrow(/Invalid VFS path/);
  });
});
