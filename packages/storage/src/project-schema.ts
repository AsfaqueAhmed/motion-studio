import type {
  CompositionId,
  ILayer,
  LayerId,
  ProjectId,
  Tick,
  TrackId,
  TrackItemId,
  TrackType,
} from "@motion-studio/shared";

export const PROJECT_SCHEMA_VERSION = 1;

/**
 * Storage's on-disk contract for a project's timeline data — not the
 * Timeline Engine's runtime model (Phase 5, PLAN.md). Timeline will map to
 * and from this shape once it exists; it's defined here because something
 * has to specify what gets persisted before Timeline is built.
 */
export interface IPersistedTrackItem {
  id: TrackItemId;
  trackId: TrackId;
  layerId: LayerId;
  startTick: Tick;
  durationTicks: Tick;
  trimInTick: Tick;
  trimOutTick: Tick;
}

export interface IPersistedTrack {
  id: TrackId;
  type: TrackType;
  label: string;
  locked: boolean;
  muted: boolean;
  items: IPersistedTrackItem[];
}

export interface IPersistedComposition {
  id: CompositionId;
  name: string;
  width: number;
  height: number;
  fps: number;
  tickResolution: number;
  durationTicks: Tick;
  tracks: IPersistedTrack[];
}

/** Project schema v1. See docs/12-storage/project-schema.md. */
export interface IProjectFileV1 {
  schemaVersion: 1;
  id: ProjectId;
  name: string;
  createdAt: number;
  updatedAt: number;
  composition: IPersistedComposition;
  /** Layers referenced by TrackItems above, keyed by LayerId. */
  layers: Record<string, ILayer>;
}

export type IProjectFile = IProjectFileV1;
