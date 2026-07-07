import { DEFAULT_TICK_RESOLUTION, toTick } from "@motion-studio/shared";
import { describe, expect, it } from "vitest";
import { AudioClockSync } from "./synchronization";

const FPS = 30;
const ONE_SECOND_TICKS = FPS * DEFAULT_TICK_RESOLUTION;

describe("AudioClockSync", () => {
  it("converts a tick to currentTime relative to the anchor", () => {
    const sync = new AudioClockSync({ fps: FPS });
    sync.anchor(toTick(0), 2);

    expect(sync.contextTimeForTick(toTick(ONE_SECOND_TICKS))).toBeCloseTo(3);
    expect(sync.contextTimeForTick(toTick(ONE_SECOND_TICKS / 2))).toBeCloseTo(2.5);
  });

  it("re-anchoring shifts subsequent conversions", () => {
    const sync = new AudioClockSync({ fps: FPS });
    sync.anchor(toTick(0), 0);
    sync.anchor(toTick(ONE_SECOND_TICKS), 10);

    expect(sync.contextTimeForTick(toTick(ONE_SECOND_TICKS * 2))).toBeCloseTo(11);
  });

  it("checkDrift does nothing and returns false within the threshold", () => {
    const sync = new AudioClockSync({ fps: FPS, resyncThresholdSeconds: 0.02 });
    sync.anchor(toTick(0), 0);

    const resynced = sync.checkDrift(toTick(ONE_SECOND_TICKS), 1.01);

    expect(resynced).toBe(false);
    expect(sync.contextTimeForTick(toTick(ONE_SECOND_TICKS))).toBeCloseTo(1);
  });

  it("checkDrift re-anchors and returns true once drift exceeds the threshold", () => {
    const sync = new AudioClockSync({ fps: FPS, resyncThresholdSeconds: 0.02 });
    sync.anchor(toTick(0), 0);

    const resynced = sync.checkDrift(toTick(ONE_SECOND_TICKS), 1.05);

    expect(resynced).toBe(true);
    expect(sync.contextTimeForTick(toTick(ONE_SECOND_TICKS))).toBeCloseTo(1.05);
  });
});
