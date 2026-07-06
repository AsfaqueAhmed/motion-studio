export type Tick = number & { readonly __brand: "Tick" };

/** Subdivisions per frame. 1s @ 30fps = 30 * 30 = 900 ticks. See GLOSSARY.md "Tick". */
export const DEFAULT_TICK_RESOLUTION = 30;

export function toTick(value: number): Tick {
  return Math.round(value) as Tick;
}

export function ticksPerSecond(
  fps: number,
  tickResolution: number = DEFAULT_TICK_RESOLUTION,
): number {
  return fps * tickResolution;
}

export function ticksToSeconds(
  tick: Tick,
  fps: number,
  tickResolution: number = DEFAULT_TICK_RESOLUTION,
): number {
  return tick / ticksPerSecond(fps, tickResolution);
}

export function secondsToTicks(
  seconds: number,
  fps: number,
  tickResolution: number = DEFAULT_TICK_RESOLUTION,
): Tick {
  return toTick(seconds * ticksPerSecond(fps, tickResolution));
}
