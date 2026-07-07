import { InterpolationType, type IKeyframe, type Tick } from "@motion-studio/shared";
import { solveCubicBezier } from "./easing";
import type { IPropertyDefinition } from "./property-definition";

export interface IKeyframeSegment {
  left: IKeyframe;
  /** `null` when `tick` is before the first keyframe or at/after the last — the value holds constant. */
  right: IKeyframe | null;
}

/**
 * Finds the two keyframes bounding a tick in a sorted, tick-unique
 * keyframe array, caching the last resolved index. During playback,
 * `evaluateAt` calls arrive with monotonically increasing ticks one frame
 * apart, almost always landing back in the same segment — this fast path
 * skips the binary search in that case. See
 * docs/06-animation-engine/animation-player.md "Incremental evaluation".
 */
export class SegmentLocator {
  private lastIndex = 0;

  locate(keyframes: readonly IKeyframe[], tick: Tick): IKeyframeSegment {
    const first = keyframes[0];
    if (!first) {
      throw new Error("SegmentLocator: cannot locate a segment in an empty keyframe array");
    }

    if (tick <= first.tick) {
      this.lastIndex = 0;
      return { left: first, right: keyframes[1] ?? null };
    }
    const lastIndex = keyframes.length - 1;
    const lastKeyframe = keyframes[lastIndex]!;
    if (tick >= lastKeyframe.tick) {
      this.lastIndex = lastIndex;
      return { left: lastKeyframe, right: null };
    }

    const cached = this.cachedSegment(keyframes, tick);
    if (cached) {
      return cached;
    }

    const index = this.binarySearch(keyframes, tick);
    this.lastIndex = index;
    return { left: keyframes[index]!, right: keyframes[index + 1]! };
  }

  invalidate(): void {
    this.lastIndex = 0;
  }

  private cachedSegment(keyframes: readonly IKeyframe[], tick: Tick): IKeyframeSegment | null {
    const left = keyframes[this.lastIndex];
    const right = keyframes[this.lastIndex + 1];
    if (left && right && left.tick <= tick && tick < right.tick) {
      return { left, right };
    }
    return null;
  }

  /** Finds the largest index `i` such that `keyframes[i].tick <= tick`. */
  private binarySearch(keyframes: readonly IKeyframe[], tick: Tick): number {
    let low = 0;
    let high = keyframes.length - 2;
    while (low < high) {
      const mid = Math.ceil((low + high) / 2);
      if (keyframes[mid]!.tick <= tick) {
        low = mid;
      } else {
        high = mid - 1;
      }
    }
    return low;
  }
}

/** Evaluates a property's value at `tick` given the two keyframes bounding it. */
export function evaluateSegment(
  segment: IKeyframeSegment,
  tick: Tick,
  definition: IPropertyDefinition,
): unknown {
  const { left, right } = segment;
  if (!right || tick <= left.tick) {
    return left.value;
  }
  if (tick >= right.tick) {
    return right.value;
  }

  const rawT = (tick - left.tick) / (right.tick - left.tick);
  let t: number;
  switch (left.interpolation) {
    case InterpolationType.Step:
      t = 0;
      break;
    case InterpolationType.Bezier:
      t = solveCubicBezier(rawT, left.bezierControlPoints ?? { x1: 0.42, y1: 0, x2: 0.58, y2: 1 });
      break;
    case InterpolationType.Linear:
    default:
      t = rawT;
      break;
  }
  return definition.interpolate(left.value, right.value, t);
}
