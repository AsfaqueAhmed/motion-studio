import { DEFAULT_TICK_RESOLUTION, PlaybackState, toTick, type Tick } from "@motion-studio/shared";

export interface IPlayheadLoop {
  inTick: Tick;
  outTick: Tick;
}

/**
 * The Timeline's tick-based playhead: current position, loop in/out points,
 * and frame-stepping, always in integer Ticks (CLAUDE.md "Canonical
 * names"). Deliberately does not run its own raf loop — Core's `Scheduler`
 * (Phase 2) already owns wall-clock-to-tick timing; a driver (the Editor
 * Service, wiring Scheduler's `onTimelineUpdate` handler) calls `advance()`
 * with the tick delta each frame. This keeps Timeline ignorant of wall-clock
 * time, per the engine ownership table in ARCHITECTURE.md §3.
 */
export class Playhead {
  private tick: Tick = toTick(0);
  private state: PlaybackState = PlaybackState.Idle;
  private loop: IPlayheadLoop | null = null;

  constructor(
    private durationTicks: Tick,
    private readonly tickResolution: number = DEFAULT_TICK_RESOLUTION,
  ) {}

  get currentTick(): Tick {
    return this.tick;
  }

  get playbackState(): PlaybackState {
    return this.state;
  }

  get loopPoints(): IPlayheadLoop | null {
    return this.loop;
  }

  setDuration(durationTicks: Tick): void {
    this.durationTicks = durationTicks;
    this.tick = this.clamp(this.tick);
  }

  setLoop(loop: IPlayheadLoop | null): void {
    if (loop && loop.inTick >= loop.outTick) {
      throw new Error("Playhead: loop inTick must be before outTick");
    }
    this.loop = loop;
  }

  play(): void {
    if (this.state === PlaybackState.Playing) {
      return;
    }
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
    this.tick = toTick(0);
  }

  seek(tick: Tick): void {
    this.tick = this.clamp(tick);
  }

  /** Steps exactly one frame forward (`direction: 1`) or backward (`direction: -1`), clamped to bounds. */
  frameStep(direction: 1 | -1): void {
    this.seek(toTick(this.tick + direction * this.tickResolution));
  }

  /**
   * Advances the playhead by an integer tick delta while playing. Wraps to
   * `loop.inTick` on overshooting `loop.outTick`, or stops at the
   * composition's end when no loop is set.
   */
  advance(deltaTicks: Tick): void {
    if (this.state !== PlaybackState.Playing) {
      return;
    }
    let next = toTick(this.tick + deltaTicks);
    if (this.loop && next > this.loop.outTick) {
      const loopLength = toTick(this.loop.outTick - this.loop.inTick + 1);
      const overshoot = toTick(next - this.loop.outTick - 1);
      next = toTick(this.loop.inTick + (overshoot % loopLength));
    } else if (!this.loop && next >= this.durationTicks) {
      next = toTick(Math.max(0, this.durationTicks - 1));
      this.state = PlaybackState.Idle;
    }
    this.tick = next;
  }

  private clamp(tick: Tick): Tick {
    return toTick(Math.min(Math.max(tick, 0), Math.max(0, this.durationTicks - 1)));
  }
}
