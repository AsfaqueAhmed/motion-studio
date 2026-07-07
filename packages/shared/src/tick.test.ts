import { describe, expect, it } from "vitest";
import {
  DEFAULT_TICK_RESOLUTION,
  secondsToTicks,
  ticksPerSecond,
  ticksToSeconds,
  toTick,
} from "./tick";

describe("toTick", () => {
  it("rounds fractional values to the nearest integer", () => {
    expect(toTick(1.4)).toBe(1);
    expect(toTick(1.5)).toBe(2);
    expect(toTick(1.6)).toBe(2);
  });

  it("passes integers through unchanged", () => {
    expect(toTick(900)).toBe(900);
    expect(toTick(0)).toBe(0);
  });

  it("rounds negative values toward the nearest integer", () => {
    expect(toTick(-1.5)).toBe(-1);
    expect(toTick(-1.6)).toBe(-2);
  });
});

describe("ticksPerSecond", () => {
  it("uses DEFAULT_TICK_RESOLUTION when none is given", () => {
    expect(ticksPerSecond(30)).toBe(30 * DEFAULT_TICK_RESOLUTION);
  });

  it("scales with an explicit tick resolution", () => {
    expect(ticksPerSecond(24, 100)).toBe(2400);
  });

  it("scales with fps", () => {
    expect(ticksPerSecond(60, 30)).toBe(1800);
  });
});

describe("secondsToTicks / ticksToSeconds round-trip", () => {
  it("1s @ 30fps is 900 ticks, per GLOSSARY.md", () => {
    expect(secondsToTicks(1, 30)).toBe(900);
    expect(ticksToSeconds(toTick(900), 30)).toBe(1);
  });

  it("round-trips whole seconds at a variety of frame rates and resolutions", () => {
    for (const fps of [24, 25, 30, 60]) {
      for (const tickResolution of [1, 30, 100]) {
        for (const seconds of [0, 1, 2, 10]) {
          const ticks = secondsToTicks(seconds, fps, tickResolution);
          expect(ticksToSeconds(ticks, fps, tickResolution)).toBeCloseTo(seconds, 10);
        }
      }
    }
  });

  it("rounds sub-half-tick seconds down to the nearest whole tick", () => {
    // 1 tick @ 30fps/30-resolution = 1/900s; well under half a tick rounds to 0.
    const ticks = secondsToTicks((1 / 900) * 0.4, 30);
    expect(ticks).toBe(0);
  });

  it("zero seconds is zero ticks", () => {
    expect(secondsToTicks(0, 30)).toBe(0);
    expect(ticksToSeconds(toTick(0), 30)).toBe(0);
  });
});
