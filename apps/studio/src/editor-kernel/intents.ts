import type {
  AssetId,
  AssetType,
  IIntent,
  LayerId,
  LayerType,
  Tick,
  TrackId,
  TrackItemId,
} from "@motion-studio/shared";

/**
 * Concrete Intents for the project-mutating actions that genuinely need the
 * Intent → Editor Service → Command(s) fan-out (`panels.md`'s canonical
 * pipeline) — one user action that must become several coordinated,
 * undoable Commands. UI-only actions that don't mutate project state
 * (tool activation, playback transport, asset import) call their Editor
 * Service's method directly instead of going through a formal Intent
 * object — there's nothing to fan out, so the extra indirection wouldn't
 * buy anything the docs' own example (`DeleteSelectionIntent`) is arguing
 * for. Each type below still satisfies `IIntent` so a future plugin or
 * macro player can construct and dispatch one identically to the
 * Toolbar/Timeline/Inspector.
 */

export type IAddClipFromAssetIntent = IIntent<
  "AddClipFromAsset",
  {
    readonly trackId: TrackId;
    readonly assetId: AssetId;
    readonly assetType: AssetType;
    readonly name: string;
    readonly startTick: Tick;
    readonly durationTicks: Tick;
  }
>;

export type IMoveTrackItemIntent = IIntent<
  "MoveTrackItem",
  { readonly trackItemId: TrackItemId; readonly toTrackId: TrackId; readonly toStartTick: Tick }
>;

export type IDeleteSelectionIntent = IIntent<
  "DeleteSelection",
  { readonly trackItemIds: readonly TrackItemId[] }
>;

export type ISetLayerPropertyIntent = IIntent<
  "SetLayerProperty",
  { readonly layerId: LayerId; readonly propertyKey: string; readonly value: unknown }
>;

export type IAddKeyframeIntent = IIntent<
  "AddKeyframe",
  {
    readonly layerId: LayerId;
    readonly layerType: LayerType;
    readonly propertyKey: string;
    readonly tick: Tick;
    readonly value: unknown;
  }
>;
