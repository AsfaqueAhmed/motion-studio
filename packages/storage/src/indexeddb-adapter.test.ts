import "fake-indexeddb/auto";
import { IDBFactory } from "fake-indexeddb";
import { beforeEach, describe, expect, it } from "vitest";
import { IndexedDBAdapter } from "./indexeddb-adapter";

function freshAdapter(): IndexedDBAdapter {
  // A fresh IDBFactory per test avoids cross-test database state leaking.
  return new IndexedDBAdapter({ indexedDB: new IDBFactory() });
}

describe("IndexedDBAdapter", () => {
  let adapter: IndexedDBAdapter;

  beforeEach(() => {
    adapter = freshAdapter();
  });

  it("returns undefined for a path that was never written", async () => {
    await expect(adapter.read("projects/missing.json")).resolves.toBeUndefined();
    await expect(adapter.exists("projects/missing.json")).resolves.toBe(false);
  });

  it("round-trips a write/read", async () => {
    const data = new TextEncoder().encode("hello");
    await adapter.write("projects/a.json", data);

    const result = await adapter.read("projects/a.json");

    expect(result).toEqual(data);
    await expect(adapter.exists("projects/a.json")).resolves.toBe(true);
  });

  it("overwrites an existing path", async () => {
    await adapter.write("settings/theme", new TextEncoder().encode("dark"));
    await adapter.write("settings/theme", new TextEncoder().encode("light"));

    const result = await adapter.read("settings/theme");

    expect(new TextDecoder().decode(result)).toBe("light");
  });

  it("delete removes the path", async () => {
    await adapter.write("projects/a.json", new Uint8Array([1]));
    await adapter.delete("projects/a.json");

    await expect(adapter.read("projects/a.json")).resolves.toBeUndefined();
  });

  it("list returns only paths under the given prefix", async () => {
    await adapter.write("thumbnails/asset1/0", new Uint8Array([1]));
    await adapter.write("thumbnails/asset1/30", new Uint8Array([2]));
    await adapter.write("thumbnails/asset2/0", new Uint8Array([3]));
    await adapter.write("projects/a.json", new Uint8Array([4]));

    const paths = await adapter.list("thumbnails/asset1/");

    expect(paths.sort()).toEqual(["thumbnails/asset1/0", "thumbnails/asset1/30"]);
  });
});
