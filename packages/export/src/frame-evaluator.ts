import {
  DEFAULT_TICK_RESOLUTION,
  secondsToTicks,
  ticksToSeconds,
  toTick,
  type IFrameState,
  type Tick,
} from "@motion-studio/shared";

/**
 * "Frame State evaluation loop (same pipeline as preview)" — PLAN.md Phase
 * 10.1. Structurally, this is exactly what a real Timeline+Animation
 * evaluation call would satisfy (`tick -> IFrameState`, ARCHITECTURE.md §4).
 * No real Timeline wiring exists yet — same "engine exists, integration is
 * a later phase" gap Phases 7/8/9 flagged for their own backends — so
 * callers inject whatever produces a Frame State for now.
 */
export interface IFrameEvaluator {
  evaluate(tick: Tick): IFrameState | Promise<IFrameState>;
}

/**
 * Draws an already-evaluated Frame State to whatever canvas the injected
 * `IVideoTrackSource` (`container.ts`) was constructed against — the same
 * `IRenderBackend` shape Rendering/preview use (`packages/rendering/src/render-backend.ts`),
 * kept as a separate structurally-compatible interface here rather than a
 * hard dependency, per the Effects Engine precedent
 * (`packages/effects/src/effect-node.ts`).
 */
export interface IExportFrameRenderer {
  renderFrame(frameState: IFrameState): Promise<void> | void;
}

export interface IExportFrame {
  readonly tick: Tick;
  readonly timestampSeconds: number;
  readonly durationSeconds: number;
}

/**
 * Resamples a Composition's own tick-space (`sourceFps`) to a preset's
 * target output fps — a project shot at 24fps can still export at 30fps.
 * Each output frame picks the nearest source tick, clamped to the last
 * valid tick in the Composition.
 */
export function computeExportFrames(
  durationTicks: Tick,
  sourceFps: number,
  targetFps: number,
  tickResolution: number = DEFAULT_TICK_RESOLUTION,
): IExportFrame[] {
  const totalSeconds = ticksToSeconds(durationTicks, sourceFps, tickResolution);
  const frameDurationSeconds = 1 / targetFps;
  const frameCount = Math.max(1, Math.round(totalSeconds * targetFps));
  const lastTick = toTick(Math.max(0, durationTicks - 1));

  return Array.from({ length: frameCount }, (_, index) => {
    const timestampSeconds = index * frameDurationSeconds;
    const sourceTick = secondsToTicks(timestampSeconds, sourceFps, tickResolution);
    return {
      tick: toTick(Math.min(sourceTick, lastTick)),
      timestampSeconds,
      durationSeconds: frameDurationSeconds,
    };
  });
}
