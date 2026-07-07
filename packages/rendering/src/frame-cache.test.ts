import { createAssetId, toTick } from "@motion-studio/shared";
import { describe, expect, it } from "vitest";
import { computeLookaheadTicks, DecodedFrameCache } from "./frame-cache";

const asset = createAssetId("asset-1");

describe("DecodedFrameCache", () => {
  it("stores and retrieves a frame by (assetId, tick)", () => {
    const cache = new DecodedFrameCache<string>();
    cache.set(asset, toTick(0), "frame-0");
    expect(cache.get(asset, toTick(0))).toBe("frame-0");
  });

  it("returns undefined for a tick that was never cached", () => {
    expect(new DecodedFrameCache<string>().get(asset, toTick(999))).toBeUndefined();
  });

  it("evicts the least-recently-used entry once capacity is exceeded", () => {
    const cache = new DecodedFrameCache<string>(2);
    cache.set(asset, toTick(0), "frame-0");
    cache.set(asset, toTick(1), "frame-1");
    cache.set(asset, toTick(2), "frame-2");
    expect(cache.has(asset, toTick(0))).toBe(false);
    expect(cache.has(asset, toTick(1))).toBe(true);
    expect(cache.has(asset, toTick(2))).toBe(true);
    expect(cache.size).toBe(2);
  });

  it("get() refreshes recency so a just-read entry survives the next eviction", () => {
    const cache = new DecodedFrameCache<string>(2);
    cache.set(asset, toTick(0), "frame-0");
    cache.set(asset, toTick(1), "frame-1");
    cache.get(asset, toTick(0)); // touch tick 0 — tick 1 is now least-recently-used
    cache.set(asset, toTick(2), "frame-2");
    expect(cache.has(asset, toTick(0))).toBe(true);
    expect(cache.has(asset, toTick(1))).toBe(false);
  });

  it("throws for a non-positive capacity", () => {
    expect(() => new DecodedFrameCache<string>(0)).toThrow(/capacity/);
  });
});

describe("computeLookaheadTicks", () => {
  it("returns one tick per upcoming frame, spaced by ticksPerFrame", () => {
    const ticks = computeLookaheadTicks(toTick(0), 30, 3);
    expect(ticks).toEqual([toTick(30), toTick(60), toTick(90)]);
  });

  it("defaults to 5 lookahead frames", () => {
    expect(computeLookaheadTicks(toTick(0), 10)).toHaveLength(5);
  });
});
