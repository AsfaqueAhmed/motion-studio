import { DEFAULT_TICK_RESOLUTION, secondsToTicks, ticksToSeconds } from "@motion-studio/shared";
import { describe, expect, it } from "vitest";
import { computeExportFrames } from "./frame-evaluator";

describe("computeExportFrames", () => {
  it("produces one frame per target-fps interval, evenly spaced, when source and target fps match", () => {
    const durationTicks = secondsToTicks(2, 30);
    const frames = computeExportFrames(durationTicks, 30, 30);

    expect(frames).toHaveLength(60);
    expect(frames[0]?.timestampSeconds).toBe(0);
    expect(frames[1]?.timestampSeconds).toBeCloseTo(1 / 30);
    expect(frames.every((frame) => frame.durationSeconds === 1 / 30)).toBe(true);
  });

  it("resamples a 24fps composition to a 30fps target preset (frame count follows the target fps)", () => {
    const durationTicks = secondsToTicks(2, 24);
    const frames = computeExportFrames(durationTicks, 24, 30);

    expect(frames).toHaveLength(60);
  });

  it("clamps every frame's source tick to the last valid tick in the composition", () => {
    const durationTicks = secondsToTicks(1, 24);
    const frames = computeExportFrames(durationTicks, 24, 30);
    const lastTick = durationTicks - 1;

    for (const frame of frames) {
      expect(frame.tick).toBeLessThanOrEqual(lastTick);
    }
  });

  it("never produces zero frames, even for a zero-duration composition", () => {
    const frames = computeExportFrames(0 as never, 30, 30);
    expect(frames).toHaveLength(1);
    expect(frames[0]?.tick).toBe(0);
  });

  it("maps output frame timestamps back to plausible source ticks", () => {
    const durationTicks = secondsToTicks(1, 30);
    const frames = computeExportFrames(durationTicks, 30, 30, DEFAULT_TICK_RESOLUTION);

    const midFrame = frames[15];
    expect(midFrame).toBeDefined();
    expect(ticksToSeconds(midFrame!.tick, 30)).toBeCloseTo(midFrame!.timestampSeconds, 1);
  });
});
