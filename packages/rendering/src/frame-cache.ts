import { toTick, type AssetId, type Tick } from "@motion-studio/shared";

function key(assetId: AssetId, tick: Tick): string {
  return `${assetId}:${tick}`;
}

/**
 * Decoded video frame cache, keyed by `(assetId, tick)`, evicting the
 * least-recently-used entry once `capacityPerInstance` is exceeded. Unlike
 * `TextureCache` (GPU memory, no budget number yet — deliberately
 * unbounded), this cache lives in regular JS heap and a simple entry-count
 * cap is a real, safe bound today; see `frame-cache.md`.
 */
export class DecodedFrameCache<TFrame> {
  private readonly capacity: number;
  private readonly entries = new Map<string, TFrame>();

  constructor(capacity = 30) {
    if (capacity < 1) {
      throw new Error("DecodedFrameCache: capacity must be at least 1");
    }
    this.capacity = capacity;
  }

  get(assetId: AssetId, tick: Tick): TFrame | undefined {
    const cacheKey = key(assetId, tick);
    const frame = this.entries.get(cacheKey);
    if (frame === undefined) {
      return undefined;
    }
    // Touch: re-insert so this key becomes most-recently-used (Map preserves insertion order).
    this.entries.delete(cacheKey);
    this.entries.set(cacheKey, frame);
    return frame;
  }

  set(assetId: AssetId, tick: Tick, frame: TFrame): void {
    const cacheKey = key(assetId, tick);
    this.entries.delete(cacheKey);
    this.entries.set(cacheKey, frame);
    if (this.entries.size > this.capacity) {
      const oldestKey = this.entries.keys().next().value as string;
      this.entries.delete(oldestKey);
    }
  }

  has(assetId: AssetId, tick: Tick): boolean {
    return this.entries.has(key(assetId, tick));
  }

  get size(): number {
    return this.entries.size;
  }
}

/**
 * Ticks to pre-decode ahead of the current playhead, one per upcoming
 * frame, so playback doesn't stall waiting on `VideoDecoder` output.
 * `ticksPerFrame` comes from the Composition's fps/tick-resolution
 * (`ticksPerSecond` in `@motion-studio/shared`, divided by fps).
 */
export function computeLookaheadTicks(
  currentTick: Tick,
  ticksPerFrame: number,
  lookaheadFrames = 5,
): Tick[] {
  const result: Tick[] = [];
  for (let i = 1; i <= lookaheadFrames; i++) {
    result.push(toTick(currentTick + i * ticksPerFrame));
  }
  return result;
}
