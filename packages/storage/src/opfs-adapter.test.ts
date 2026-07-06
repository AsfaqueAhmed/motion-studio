import { beforeEach, describe, expect, it } from "vitest";
import { OpfsAdapter } from "./opfs-adapter";
import { createFakeOpfsRoot } from "./test-support/fake-opfs";

function freshAdapter(): OpfsAdapter {
  const root = createFakeOpfsRoot();
  return new OpfsAdapter({ getRoot: () => Promise.resolve(root) });
}

describe("OpfsAdapter", () => {
  let adapter: OpfsAdapter;

  beforeEach(() => {
    adapter = freshAdapter();
  });

  it("returns undefined for a path that was never written", async () => {
    await expect(adapter.read("assets/deadbeef")).resolves.toBeUndefined();
    await expect(adapter.exists("assets/deadbeef")).resolves.toBe(false);
  });

  it("round-trips a write/read, creating nested directories as needed", async () => {
    const data = new Uint8Array([1, 2, 3, 4]);
    await adapter.write("assets/ab/cdef", data);

    const result = await adapter.read("assets/ab/cdef");

    expect(result).toEqual(data);
    await expect(adapter.exists("assets/ab/cdef")).resolves.toBe(true);
  });

  it("delete on a missing path is a no-op", async () => {
    await expect(adapter.delete("assets/never-written")).resolves.toBeUndefined();
  });

  it("delete removes an existing file", async () => {
    await adapter.write("assets/foo", new Uint8Array([1]));
    await adapter.delete("assets/foo");

    await expect(adapter.exists("assets/foo")).resolves.toBe(false);
  });

  it("list walks nested directories and returns full paths under the prefix", async () => {
    await adapter.write("assets/a", new Uint8Array([1]));
    await adapter.write("assets/sub/b", new Uint8Array([2]));
    await adapter.write("models/kokoro/weights.bin", new Uint8Array([3]));

    const paths = await adapter.list("assets/");

    expect(paths.sort()).toEqual(["assets/a", "assets/sub/b"]);
  });

  it("list on a directory prefix that was never created returns an empty array", async () => {
    await expect(adapter.list("thumbnails/asset1/")).resolves.toEqual([]);
  });

  it("list with a non-directory (no trailing slash) prefix still filters correctly", async () => {
    await adapter.write("assets/abc", new Uint8Array([1]));
    await adapter.write("assets/abd", new Uint8Array([2]));
    await adapter.write("assets/xyz", new Uint8Array([3]));

    const paths = await adapter.list("assets/ab");

    expect(paths.sort()).toEqual(["assets/abc", "assets/abd"]);
  });
});
