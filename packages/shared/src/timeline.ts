import type { TrackType } from "./enums";
import type { CompositionId, LayerId, TrackId, TrackItemId } from "./ids";
import type { Tick } from "./tick";

/**
 * The canonical "when": one placement of a Layer (the "what", see layer.ts)
 * on a Track. References the Layer by id and never embeds it, so one Layer
 * can appear in many TrackItems with no duplication. `trimInTick`/
 * `trimOutTick` are offsets into the referenced Layer's own source media
 * (e.g. a VideoLayer's decoded timeline), independent of `startTick`, which
 * is this item's position on the Timeline. See
 * docs/07-timeline-engine/overview.md and CLAUDE.md "Canonical names".
 */
export interface ITrackItem {
  id: TrackItemId;
  trackId: TrackId;
  layerId: LayerId;
  startTick: Tick;
  durationTicks: Tick;
  trimInTick: Tick;
  trimOutTick: Tick;
}

/**
 * A lane of non-overlapping TrackItems. See
 * docs/07-timeline-engine/tracks.md.
 */
export interface ITrack {
  id: TrackId;
  type: TrackType;
  label: string;
  locked: boolean;
  muted: boolean;
  /** TrackItem ids placed on this track. Order is not significant — use TimelineEngine for tick-sorted queries. */
  items: TrackItemId[];
}

/**
 * The root of one editable timeline: dimensions, frame rate, and the Tracks
 * that make it up. See docs/07-timeline-engine/overview.md.
 */
export interface IComposition {
  id: CompositionId;
  name: string;
  width: number;
  height: number;
  fps: number;
  durationTicks: Tick;
  tracks: TrackId[];
}
