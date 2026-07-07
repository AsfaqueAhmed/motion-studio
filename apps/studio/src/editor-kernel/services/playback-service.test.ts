import { PlaybackState, toTick } from "@motion-studio/shared";
import { describe, expect, it, vi } from "vitest";
import { PlaybackService } from "./playback-service";

/** Mirrors `packages/core/src/scheduler.test.ts`'s manual-driver pattern so playback advances deterministically, not via real rAF. */
function createManualPlaybackService(durationTicks: number, fps = 30) {
  let pendingCallback: ((time: number) => void) | null = null;
  const requestFrame = vi.fn((callback: (time: number) => void) => {
    pendingCallback = callback;
    return 1;
  });
  const cancelFrame = vi.fn(() => {
    pendingCallback = null;
  });
  const service = new PlaybackService(toTick(durationTicks), fps, { requestFrame, cancelFrame });
  return { service, fireFrame: (time: number) => pendingCallback?.(time) };
}

describe("PlaybackService", () => {
  it("starts idle at tick 0", () => {
    const { service } = createManualPlaybackService(9000);
    expect(service.playbackState).toBe(PlaybackState.Idle);
    expect(service.currentTick).toBe(0);
  });

  it("advances the Playhead's tick as scheduler frames fire while playing", () => {
    const { service, fireFrame } = createManualPlaybackService(9000);
    service.play();

    fireFrame(0);
    fireFrame(16);

    expect(service.playbackState).toBe(PlaybackState.Playing);
    expect(service.currentTick).toBeGreaterThan(0);
  });

  it("does not advance while paused", () => {
    const { service, fireFrame } = createManualPlaybackService(9000);
    service.play();
    fireFrame(0);
    fireFrame(16);
    service.pause();
    const tickAtPause = service.currentTick;

    fireFrame(32);

    expect(service.currentTick).toBe(tickAtPause);
    expect(service.playbackState).toBe(PlaybackState.Paused);
  });

  it("seek() moves the tick without needing playback to be active", () => {
    const { service } = createManualPlaybackService(9000);
    service.seek(toTick(500));
    expect(service.currentTick).toBe(500);
  });

  it("stop() resets to tick 0 and Idle", () => {
    const { service } = createManualPlaybackService(9000);
    service.seek(toTick(500));
    service.stop();
    expect(service.currentTick).toBe(0);
    expect(service.playbackState).toBe(PlaybackState.Idle);
  });

  it("notifies onTick listeners on seek and on scheduler-driven advances", () => {
    const { service, fireFrame } = createManualPlaybackService(9000);
    const ticks: number[] = [];
    service.onTick((tick) => ticks.push(tick));

    service.seek(toTick(10));
    service.play();
    fireFrame(0);
    fireFrame(16);

    expect(ticks[0]).toBe(10);
    expect(ticks.length).toBeGreaterThan(1);
  });

  it("stops advancing at the composition duration when no loop is set", () => {
    const { service, fireFrame } = createManualPlaybackService(20);
    service.play();

    fireFrame(0);
    for (let i = 1; i <= 20; i++) {
      fireFrame(i * 1000);
    }

    expect(service.playbackState).toBe(PlaybackState.Idle);
    expect(service.currentTick).toBeLessThan(20);
  });
});
