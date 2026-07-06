import { PlaybackState, toTick } from "@motion-studio/shared";
import { describe, expect, it, vi } from "vitest";
import { frameNumberToTick, Scheduler, tickToFrameNumber } from "./scheduler";

describe("tickToFrameNumber / frameNumberToTick", () => {
  it("converts using the tick resolution, independent of fps", () => {
    expect(tickToFrameNumber(toTick(900), 30)).toBe(30);
    expect(tickToFrameNumber(toTick(915), 30)).toBe(30);
    expect(frameNumberToTick(30, 30)).toBe(900);
  });

  it("round-trips frame -> tick -> frame", () => {
    const frame = 42;
    expect(tickToFrameNumber(frameNumberToTick(frame))).toBe(frame);
  });
});

describe("Scheduler", () => {
  function createManualScheduler() {
    let pendingCallback: ((time: number) => void) | null = null;
    const requestFrame = vi.fn((callback: (time: number) => void) => {
      pendingCallback = callback;
      return 1;
    });
    const cancelFrame = vi.fn(() => {
      pendingCallback = null;
    });
    const handlers = {
      onAnimationUpdate: vi.fn(),
      onTimelineUpdate: vi.fn(),
      onSelectionUpdate: vi.fn(),
      onAudioSync: vi.fn(),
      onRenderFrame: vi.fn(),
      onPresentFrame: vi.fn(),
    };
    const scheduler = new Scheduler(handlers, { requestFrame, cancelFrame });
    return {
      scheduler,
      handlers,
      requestFrame,
      cancelFrame,
      fireFrame: (time: number) => pendingCallback?.(time),
    };
  }

  it("starts idle at tick 0", () => {
    const { scheduler } = createManualScheduler();
    expect(scheduler.playbackState).toBe(PlaybackState.Idle);
    expect(scheduler.currentTick).toBe(0);
  });

  it("runs the fixed pipeline in order on seek", () => {
    const { scheduler, handlers } = createManualScheduler();
    const order: string[] = [];
    handlers.onAnimationUpdate.mockImplementation(() => order.push("animation"));
    handlers.onTimelineUpdate.mockImplementation(() => order.push("timeline"));
    handlers.onSelectionUpdate.mockImplementation(() => order.push("selection"));
    handlers.onAudioSync.mockImplementation(() => order.push("audio"));
    handlers.onRenderFrame.mockImplementation(() => order.push("render"));
    handlers.onPresentFrame.mockImplementation(() => order.push("present"));

    scheduler.seek(toTick(100));

    expect(order).toEqual(["animation", "timeline", "selection", "audio", "render", "present"]);
    expect(scheduler.currentTick).toBe(100);
  });

  it("play() schedules a frame and advances the tick as frames fire", () => {
    const { scheduler, fireFrame, requestFrame } = createManualScheduler();

    scheduler.play();
    expect(scheduler.playbackState).toBe(PlaybackState.Playing);
    expect(requestFrame).toHaveBeenCalledTimes(1);

    fireFrame(0);
    fireFrame(16);

    expect(scheduler.currentTick).toBeGreaterThan(0);
  });

  it("pause() stops advancing and cancels the pending frame", () => {
    const { scheduler, fireFrame, cancelFrame } = createManualScheduler();

    scheduler.play();
    fireFrame(0);
    scheduler.pause();
    const tickAtPause = scheduler.currentTick;

    fireFrame(16);

    expect(cancelFrame).toHaveBeenCalled();
    expect(scheduler.playbackState).toBe(PlaybackState.Paused);
    expect(scheduler.currentTick).toBe(tickAtPause);
  });

  it("stop() resets the tick to 0 and returns to Idle", () => {
    const { scheduler } = createManualScheduler();

    scheduler.seek(toTick(500));
    scheduler.stop();

    expect(scheduler.currentTick).toBe(0);
    expect(scheduler.playbackState).toBe(PlaybackState.Idle);
  });

  it("seek() while playing keeps the Playing state", () => {
    const { scheduler } = createManualScheduler();

    scheduler.play();
    scheduler.seek(toTick(200));

    expect(scheduler.playbackState).toBe(PlaybackState.Playing);
    expect(scheduler.currentTick).toBe(200);
  });
});
