import type { AssetId, AssetType, TrackId, TrackItemId } from "@motion-studio/shared";

/** Shared `useDraggable`/`useDroppable` payload shapes for the Timeline's one drag pipeline (`editor-shell.tsx`, `timeline-panel.tsx`, `asset-browser-panel.tsx`). */
export type DragData =
  | {
      type: "asset";
      assetId: AssetId;
      assetType: AssetType;
      name: string;
      /** Present for Image/Video only — lets the drop handler auto-fit the new layer to the composition frame without an extra async catalog lookup. */
      width: number | undefined;
      height: number | undefined;
    }
  | { type: "clip"; trackItemId: TrackItemId };

export type DropData = { type: "track"; trackId: TrackId };
