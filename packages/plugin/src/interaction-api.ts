import type { IBounds, ITransform2D, LayerId, Tick, TrackItemId } from "@motion-studio/shared";

/** Mirrors `apps/studio`'s `ITimelineSelection` structurally — this package never imports from `apps/studio`. */
export interface IToolSelection {
  readonly layerIds: readonly LayerId[];
  readonly trackItemIds: readonly TrackItemId[];
}

/** Mirrors `apps/studio`'s `IViewportCamera` structurally, same reason as `IToolSelection`. */
export interface IToolCamera {
  readonly panX: number;
  readonly panY: number;
  readonly zoom: number;
}

export interface IToolHitResult {
  readonly layerId: LayerId;
}

/**
 * The `"interaction"` permission's sub-API (`docs/17-ui/toolbar.md`'s
 * `InteractionContext` — the capability half; per-event pointer data is
 * `IInteractionEvent` in `tool-api.ts`, passed separately to each call).
 * Deliberately narrow: exactly what the 5 built-in tools in
 * `built-ins/` need — read/write Editor State (selection, camera), the
 * handful of project mutations tools can trigger, and hit-testing (no
 * "Selection Engine" package exists — `toolbar.md` describes one but it
 * was never built, see that doc's own note — so this is the same
 * AABB-based hit test `packages/rendering/src/hit-test.ts` exposes,
 * reused rather than duplicated).
 */
export interface IToolInteractionAPI {
  getSelection(): IToolSelection;
  setSelection(selection: IToolSelection): void;
  getCamera(): IToolCamera;
  setCamera(camera: IToolCamera): void;
  /** Creates a default-sized synthetic layer (no asset) centered at the given world point. */
  createLayerAtPoint(kind: "text" | "shape", worldX: number, worldY: number): void;
  /** Applied as one undo step even when multiple fields change (e.g. a scale-corner drag touching `scaleX` and `scaleY`). */
  updateLayerTransform(layerId: LayerId, updates: Partial<ITransform2D>): void;
  splitTrackItemAt(trackItemId: TrackItemId, atTick: Tick): void;
  hitTestPoint(worldX: number, worldY: number): IToolHitResult | undefined;
  /** Every layer whose world bounds intersect `box`, topmost (highest zIndex) first. */
  hitTestBox(box: IBounds): IToolHitResult[];
}
