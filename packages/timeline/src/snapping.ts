import { toTick, type Tick, type TrackId, type TrackItemId } from "@motion-studio/shared";
import type { TimelineEngine } from "./timeline-engine";

/**
 * Snaps `candidateTick` to the nearest tick in `targets` if one is within
 * `thresholdTicks`, otherwise returns `candidateTick` unchanged. Used for
 * snapping to the playhead, other clip edges, and the grid alike — callers
 * assemble whichever target list applies. See
 * docs/07-timeline-engine/snapping.md.
 */
export function snapTick(
  candidateTick: Tick,
  targets: readonly Tick[],
  thresholdTicks: Tick,
): Tick {
  let closest = candidateTick;
  let closestDistance = thresholdTicks;
  for (const target of targets) {
    const distance = Math.abs(target - candidateTick);
    if (distance <= closestDistance) {
      closest = target;
      closestDistance = toTick(distance);
    }
  }
  return closest;
}

/** Start and end tick of every TrackItem on `trackId`, excluding `excludeItemId` (the item being dragged). */
export function getClipEdgeTicks(
  engine: TimelineEngine,
  trackId: TrackId,
  excludeItemId?: TrackItemId,
): Tick[] {
  const edges: Tick[] = [];
  for (const item of engine.getTrackItemsSorted(trackId)) {
    if (item.id === excludeItemId) {
      continue;
    }
    edges.push(item.startTick, toTick(item.startTick + item.durationTicks));
  }
  return edges;
}

/** Nearest multiple of `gridTicks` to `candidateTick`. */
export function nearestGridTick(candidateTick: Tick, gridTicks: Tick): Tick {
  if (gridTicks <= 0) {
    return candidateTick;
  }
  return toTick(Math.round(candidateTick / gridTicks) * gridTicks);
}
