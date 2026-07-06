import { DEFAULT_TICK_RESOLUTION, PlaybackState, toTick, type Tick } from "@motion-studio/shared";

/** Ticks are subdivisions of a frame, so the frame number never depends on fps. */
export function tickToFrameNumber(
  tick: Tick,
  tickResolution: number = DEFAULT_TICK_RESOLUTION,
): number {
  return Math.floor(tick / tickResolution);
}

export function frameNumberToTick(
  frameNumber: number,
  tickResolution: number = DEFAULT_TICK_RESOLUTION,
): Tick {
  return toTick(frameNumber * tickResolution);
}

export type FrameRequester = (callback: (time: number) => void) => number;
export type FrameCanceller = (handle: number) => void;

/**
 * The fixed per-frame pipeline from docs/04-core/core-overview.md. This is a
 * direct call chain, not an Event Bus dispatch — engines never decide
 * execution order themselves, the Scheduler does.
 */
export interface ISchedulerFrameHandlers {
  onAnimationUpdate?(tick: Tick): void;
  onTimelineUpdate?(tick: Tick): void;
  onSelectionUpdate?(tick: Tick): void;
  onAudioSync?(tick: Tick): void;
  onRenderFrame?(tick: Tick): void;
  onPresentFrame?(tick: Tick): void;
}

export interface ISchedulerOptions {
  tickResolution?: number;
  /** Ticks advanced per wall-clock second while playing. Defaults to 30fps * tickResolution. */
  ticksPerSecond?: number;
  requestFrame?: FrameRequester;
  cancelFrame?: FrameCanceller;
}

const defaultRequestFrame: FrameRequester = (callback) =>
  typeof requestAnimationFrame === "function"
    ? requestAnimationFrame(callback)
    : (setTimeout(() => callback(Date.now()), 1000 / 60) as unknown as number);

const defaultCancelFrame: FrameCanceller = (handle) =>
  typeof cancelAnimationFrame === "function" ? cancelAnimationFrame(handle) : clearTimeout(handle);

/** raf-based tick scheduler driving the preview loop. See PLAN.md Phase 2.3. */
export class Scheduler {
  private readonly handlers: ISchedulerFrameHandlers;
  private readonly tickResolution: number;
  private readonly ticksPerSecond: number;
  private readonly requestFrame: FrameRequester;
  private readonly cancelFrame: FrameCanceller;

  private state: PlaybackState = PlaybackState.Idle;
  private tick: Tick = toTick(0);
  private frameHandle: number | null = null;
  private lastFrameTime: number | null = null;

  constructor(handlers: ISchedulerFrameHandlers, options: ISchedulerOptions = {}) {
    this.handlers = handlers;
    this.tickResolution = options.tickResolution ?? DEFAULT_TICK_RESOLUTION;
    this.ticksPerSecond = options.ticksPerSecond ?? 30 * this.tickResolution;
    this.requestFrame = options.requestFrame ?? defaultRequestFrame;
    this.cancelFrame = options.cancelFrame ?? defaultCancelFrame;
  }

  get playbackState(): PlaybackState {
    return this.state;
  }

  get currentTick(): Tick {
    return this.tick;
  }

  play(): void {
    if (this.state === PlaybackState.Playing) {
      return;
    }
    this.state = PlaybackState.Playing;
    this.lastFrameTime = null;
    this.scheduleNext();
  }

  pause(): void {
    if (this.state !== PlaybackState.Playing) {
      return;
    }
    this.state = PlaybackState.Paused;
    this.cancelScheduled();
  }

  stop(): void {
    this.state = PlaybackState.Idle;
    this.cancelScheduled();
    this.seek(toTick(0));
  }

  seek(tick: Tick): void {
    this.state =
      this.state === PlaybackState.Playing ? PlaybackState.Playing : PlaybackState.Seeking;
    this.tick = tick;
    this.runFramePipeline();
    if (this.state === PlaybackState.Seeking) {
      this.state = PlaybackState.Idle;
    }
  }

  /** Advances the tick by one wall-clock frame tick and runs the pipeline. Exposed for deterministic testing. */
  step(deltaMs: number): void {
    const deltaTicks = toTick(Math.round((deltaMs / 1000) * this.ticksPerSecond));
    this.tick = toTick(this.tick + deltaTicks);
    this.runFramePipeline();
  }

  private scheduleNext(): void {
    this.frameHandle = this.requestFrame((time) => this.onFrame(time));
  }

  private cancelScheduled(): void {
    if (this.frameHandle !== null) {
      this.cancelFrame(this.frameHandle);
      this.frameHandle = null;
    }
  }

  private onFrame(time: number): void {
    if (this.state !== PlaybackState.Playing) {
      return;
    }
    const delta = this.lastFrameTime === null ? 0 : time - this.lastFrameTime;
    this.lastFrameTime = time;
    this.step(delta);
    this.scheduleNext();
  }

  private runFramePipeline(): void {
    const tick = this.tick;
    this.handlers.onAnimationUpdate?.(tick);
    this.handlers.onTimelineUpdate?.(tick);
    this.handlers.onSelectionUpdate?.(tick);
    this.handlers.onAudioSync?.(tick);
    this.handlers.onRenderFrame?.(tick);
    this.handlers.onPresentFrame?.(tick);
  }
}
