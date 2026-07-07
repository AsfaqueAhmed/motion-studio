import { PlaybackState, type Tick } from "@motion-studio/shared";
import type { IAudioContext } from "./audio-context";
import { AudioClockSync, type IAudioClockSyncOptions } from "./synchronization";

/**
 * Realtime playback transport, per `docs/10-audio-engine/playback.md`.
 * Deliberately thin and driver-free — Core's `Scheduler` (Phase 2) owns
 * the actual raf loop and calls `onAudioSync(tick)` once per frame; this
 * class only tracks `PlaybackState` and the tick<->currentTime anchor.
 * Same ownership split as Timeline's `Playhead`
 * (`packages/timeline/src/playhead.ts`): Audio never runs its own clock
 * loop, it reacts to ticks handed to it by the Scheduler.
 */
export class AudioTransport {
  private readonly context: IAudioContext;
  private readonly clock: AudioClockSync;
  private state: PlaybackState = PlaybackState.Idle;

  constructor(context: IAudioContext, options: IAudioClockSyncOptions) {
    this.context = context;
    this.clock = new AudioClockSync(options);
  }

  get playbackState(): PlaybackState {
    return this.state;
  }

  play(currentTick: Tick): void {
    if (this.state === PlaybackState.Playing) {
      return;
    }
    this.clock.anchor(currentTick, this.context.currentTime);
    this.state = PlaybackState.Playing;
  }

  pause(): void {
    if (this.state !== PlaybackState.Playing) {
      return;
    }
    this.state = PlaybackState.Paused;
  }

  stop(): void {
    this.state = PlaybackState.Idle;
  }

  /** Re-anchors the clock at the seeked-to tick, matching Timeline's `Playhead.seek()`. */
  seek(tick: Tick): void {
    this.clock.anchor(tick, this.context.currentTime);
  }

  /**
   * Wired to Core's `Scheduler.onAudioSync(tick)` handler. No-ops while
   * not playing (paused/idle/seeking don't accumulate drift). Returns
   * whether a resync happened, for tests/telemetry.
   */
  onAudioSync(tick: Tick): boolean {
    if (this.state !== PlaybackState.Playing) {
      return false;
    }
    return this.clock.checkDrift(tick, this.context.currentTime);
  }

  /** The `AudioContext.currentTime` a clip chain should be scheduled at to sound in sync with `tick`. */
  scheduledTimeForTick(tick: Tick): number {
    return this.clock.contextTimeForTick(tick);
  }
}
