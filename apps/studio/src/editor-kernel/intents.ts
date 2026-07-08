import type {
  AssetId,
  AssetType,
  CompositionId,
  IIntent,
  ITransform2D,
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
    readonly compositionId: CompositionId;
    readonly assetId: AssetId;
    readonly assetType: AssetType;
    readonly name: string;
    readonly startTick: Tick;
    readonly durationTicks: Tick;
    /** Present for Image/Video only — lets the service auto-fit the new layer to the composition frame. */
    readonly assetWidth: number | undefined;
    readonly assetHeight: number | undefined;
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

export type ISetCompositionSizeIntent = IIntent<
  "SetCompositionSize",
  { readonly compositionId: CompositionId; readonly width: number; readonly height: number }
>;

export type ISetLayerPropertyIntent = IIntent<
  "SetLayerProperty",
  { readonly layerId: LayerId; readonly propertyKey: string; readonly value: unknown }
>;

/** Batched transform patch — one undo step for several changed fields at once (e.g. a Canvas drag-resize/move gesture), unlike `SetLayerProperty`'s single key. */
export type ISetLayerTransformIntent = IIntent<
  "SetLayerTransform",
  { readonly layerId: LayerId; readonly transform: Partial<ITransform2D> }
>;

/**
 * CapCut-style unified keyframe: one toggle for the whole transform (x, y,
 * scaleX, scaleY, rotation together — the same set
 * `frame-state-builder.ts`'s `TRANSFORM_KEYS` names) at a tick, not one
 * button per property. If a keyframe already exists at `tick` this removes
 * it; otherwise it adds one for every transform key, capturing each
 * property's current value.
 */
export type IToggleKeyframeIntent = IIntent<
  "ToggleKeyframe",
  { readonly layerId: LayerId; readonly layerType: LayerType; readonly tick: Tick }
>;
