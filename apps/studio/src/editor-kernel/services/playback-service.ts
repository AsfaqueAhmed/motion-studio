import { Scheduler, type ISchedulerOptions } from "@motion-studio/core";
import { DEFAULT_TICK_RESOLUTION, toTick, type Tick } from "@motion-studio/shared";
import { Playhead, type IPlayheadLoop } from "@motion-studio/timeline";

export type PlaybackTickListener = (tick: Tick) => void;

/**
 * Wires the Timeline's `Playhead` to Core's `Scheduler`, per that class's
 * own doc comment: "a driver (the Editor Service, wiring Scheduler's
 * `onTimelineUpdate` handler) calls `advance()` with the tick delta each
 * frame." `Scheduler` tracks its own monotonic tick counter (for raf timing
 * math); this service only reads the *delta* between consecutive Scheduler
 * ticks and feeds that to `Playhead`, which is the actual source of truth
 * for playback position (play/pause/loop/duration-clamp all live there) —
 * so there's exactly one authoritative "current tick," not two clocks
 * disagreeing with each other.
 *
 * Playback position is Editor State (`17-ui/panels.md`: "active tool,
 * selection, ... playback state ... lives in Editor State"), not project
 * data, so play/pause/seek go straight to `Playhead` — never through the
 * Command Bus/History.
 */
export class PlaybackService {
  private readonly playhead: Playhead;
  private readonly scheduler: Scheduler;
  private lastSchedulerTick: Tick = toTick(0);
  private readonly listeners = new Set<PlaybackTickListener>();

  constructor(durationTicks: Tick, fps: number, options: ISchedulerOptions = {}) {
    this.playhead = new Playhead(durationTicks);
    const tickResolution = options.tickResolution ?? DEFAULT_TICK_RESOLUTION;
    this.scheduler = new Scheduler(
      { onTimelineUpdate: (tick) => this.onSchedulerTick(tick) },
      {
        ...options,
        tickResolution,
        ticksPerSecond: options.ticksPerSecond ?? fps * tickResolution,
      },
    );
  }

  get currentTick(): Tick {
    return this.playhead.currentTick;
  }

  get playbackState() {
    return this.playhead.playbackState;
  }

  onTick(listener: PlaybackTickListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  setDuration(durationTicks: Tick): void {
    this.playhead.setDuration(durationTicks);
  }

  setLoop(loop: IPlayheadLoop | null): void {
    this.playhead.setLoop(loop);
  }

  play(): void {
    this.playhead.play();
    this.scheduler.play();
  }

  pause(): void {
    this.playhead.pause();
    this.scheduler.pause();
  }

  /**
   * Stops via `scheduler.pause()`, not `scheduler.stop()` — the latter's
   * own `seek(0)` runs the frame pipeline synchronously, which would
   * re-enter `onSchedulerTick` before `playhead.stop()`'s Idle state took
   * effect. Only `Scheduler`'s raf loop needs halting here; resetting to
   * tick 0 is `Playhead.stop()`'s job.
   */
  stop(): void {
    this.playhead.stop();
    this.scheduler.pause();
    this.notify();
  }

  /**
   * Manual scrub — deliberately doesn't touch `Scheduler` at all.
   * `Scheduler`'s own tick counter only matters for computing the delta
   * between consecutive raf frames while playing; as long as `Playhead` is
   * the one source of truth callers read from, letting the two diverge in
   * absolute terms is harmless.
   */
  seek(tick: Tick): void {
    this.playhead.seek(tick);
    this.notify();
  }

  frameStep(direction: 1 | -1): void {
    this.playhead.frameStep(direction);
    this.notify();
  }

  private onSchedulerTick(tick: Tick): void {
    const delta = toTick(tick - this.lastSchedulerTick);
    this.lastSchedulerTick = tick;
    this.playhead.advance(delta);
    this.notify();
  }

  private notify(): void {
    for (const listener of this.listeners) {
      listener(this.playhead.currentTick);
    }
  }
}
