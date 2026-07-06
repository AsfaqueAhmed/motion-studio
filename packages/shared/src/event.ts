import type { ExportJobStatus } from "./enums";
import type { AssetId, CompositionId, LayerId, ProjectId, TrackItemId } from "./ids";
import type { Tick } from "./tick";

/**
 * Base shape for every event on the Event Bus. Every listener declares its
 * exact event type — no wildcard subscriptions. See STYLE_GUIDE.md and
 * docs/04-core/overview.md.
 */
export interface IEvent<TType extends string = string, TPayload = unknown> {
  readonly type: TType;
  readonly payload: TPayload;
  readonly timestamp: number;
}

export interface AppEventMap {
  LayerSelected: { layerIds: LayerId[] };
  LayerDeselected: { layerIds: LayerId[] };
  PlaybackStarted: { atTick: Tick };
  PlaybackPaused: { atTick: Tick };
  PlaybackStopped: Record<string, never>;
  PlaybackSeeked: { toTick: Tick };
  TrackItemMoved: { trackItemId: TrackItemId; toTick: Tick };
  TrackItemTrimmed: { trackItemId: TrackItemId; inTick: Tick; outTick: Tick };
  TrackItemSplit: { trackItemId: TrackItemId; atTick: Tick };
  TrackItemDeleted: { trackItemId: TrackItemId };
  CompositionOpened: { compositionId: CompositionId };
  ProjectSaved: { projectId: ProjectId };
  ProjectLoaded: { projectId: ProjectId };
  ExportProgressed: { jobId: string; status: ExportJobStatus; progress: number };
  ExportCompleted: { jobId: string };
  ExportFailed: { jobId: string; reason: string };
  CommandExecuted: { commandId: string };
  CommandUndone: { commandId: string };
  CommandRedone: { commandId: string };
  AssetImported: { assetId: AssetId };
  AssetImportFailed: { reason: string };
}

export type AppEventType = keyof AppEventMap;

export type AppEvent<TType extends AppEventType = AppEventType> = {
  [K in TType]: IEvent<K, AppEventMap[K]>;
}[TType];
