import { describe, expect, it } from "vitest";
import { TextureCache } from "./texture-cache";

describe("TextureCache", () => {
  it("stores and retrieves a handle by key", () => {
    const cache = new TextureCache();
    const handle = { key: "asset-1", width: 1920, height: 1080 };
    cache.set("asset-1", handle);
    expect(cache.get("asset-1")).toBe(handle);
    expect(cache.has("asset-1")).toBe(true);
  });

  it("returns undefined for a missing key", () => {
    expect(new TextureCache().get("missing")).toBeUndefined();
  });

  it("delete removes an entry", () => {
    const cache = new TextureCache();
    cache.set("a", { key: "a", width: 1, height: 1 });
    expect(cache.delete("a")).toBe(true);
    expect(cache.has("a")).toBe(false);
  });

  it("clear empties the cache", () => {
    const cache = new TextureCache();
    cache.set("a", { key: "a", width: 1, height: 1 });
    cache.set("b", { key: "b", width: 1, height: 1 });
    cache.clear();
    expect(cache.size).toBe(0);
  });

  it("never evicts on its own — no entry count limit (GPU memory budget still open, see docstring)", () => {
    const cache = new TextureCache();
    for (let i = 0; i < 10_000; i++) {
      cache.set(`key-${i}`, { key: `key-${i}`, width: 1, height: 1 });
    }
    expect(cache.size).toBe(10_000);
  });
});
