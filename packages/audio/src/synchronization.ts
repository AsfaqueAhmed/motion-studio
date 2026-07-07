import { DEFAULT_TICK_RESOLUTION, ticksToSeconds, toTick, type Tick } from "@motion-studio/shared";

export interface IAudioClockSyncOptions {
  readonly fps: number;
  readonly tickResolution?: number;
  /** Drift beyond this many seconds triggers a hard resync. Defaults to 15ms, per `synchronization.md`. */
  readonly resyncThresholdSeconds?: number;
}

/**
 * Explicit periodic resync strategy for the Timeline's integer-Tick clock
 * vs. Web Audio's continuous `AudioContext.currentTime` — the real, open
 * risk CLAUDE.md flags ("Known hard risks" #5) and `synchronization.md`
 * names directly: "driven by Timeline ticks" is a philosophy, not a
 * mechanism, because the two clocks are genuinely different primitives
 * and per-conversion floating-point rounding can accumulate into audible
 * drift over long (2h+) projects.
 *
 * Mechanism: anchor one `(tick, currentTime)` pair whenever playback
 * starts or an explicit seek happens (`anchor()`). Every subsequent tick
 * converts against that anchor (`contextTimeForTick()`), which is exact
 * for the ticks scheduled right after an anchor and drifts further away
 * from it over time. `checkDrift()` — called every frame from Core's
 * `Scheduler.onAudioSync` handler (`packages/core/src/scheduler.ts`) —
 * compares the anchor's prediction against the real `currentTime` and
 * re-anchors once drift crosses the threshold, instead of trying to
 * "correct" gradually (which would itself require pitch-bending playback
 * rate to catch up, adding audible artifacts of its own).
 */
export class AudioClockSync {
  private readonly fps: number;
  private readonly tickResolution: number;
  private readonly resyncThresholdSeconds: number;
  private anchorTick: Tick = toTick(0);
  private anchorContextTime = 0;

  constructor(options: IAudioClockSyncOptions) {
    this.fps = options.fps;
    this.tickResolution = options.tickResolution ?? DEFAULT_TICK_RESOLUTION;
    this.resyncThresholdSeconds = options.resyncThresholdSeconds ?? 0.015;
  }

  /** Re-anchors the clock so that `tick` corresponds to `contextTime`. Call on play() and on every explicit seek(). */
  anchor(tick: Tick, contextTime: number): void {
    this.anchorTick = tick;
    this.anchorContextTime = contextTime;
  }

  /** The `AudioContext.currentTime` at which `tick` should sound, given the current anchor. */
  contextTimeForTick(tick: Tick): number {
    const deltaSeconds = ticksToSeconds(
      toTick(tick - this.anchorTick),
      this.fps,
      this.tickResolution,
    );
    return this.anchorContextTime + deltaSeconds;
  }

  /**
   * Compares the anchor's prediction for `currentTick` against the real
   * `actualContextTime`; re-anchors and returns `true` if drift exceeds
   * the threshold, otherwise returns `false` with no state change.
   */
  checkDrift(currentTick: Tick, actualContextTime: number): boolean {
    const expected = this.contextTimeForTick(currentTick);
    const drift = Math.abs(actualContextTime - expected);
    if (drift > this.resyncThresholdSeconds) {
      this.anchor(currentTick, actualContextTime);
      return true;
    }
    return false;
  }
}
