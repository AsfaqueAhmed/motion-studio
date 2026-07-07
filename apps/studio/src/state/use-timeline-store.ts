import type { LayerId, TrackItemId } from "@motion-studio/shared";
import { create } from "zustand";

export interface ITimelineSelection {
  readonly layerIds: readonly LayerId[];
  readonly trackItemIds: readonly TrackItemId[];
}

interface ITimelineState {
  readonly zoomTicksPerPixel: number;
  readonly scrollPixels: number;
  readonly selection: ITimelineSelection;
  setZoom(ticksPerPixel: number): void;
  setScroll(pixels: number): void;
  select(selection: ITimelineSelection): void;
  clearSelection(): void;
}

const EMPTY_SELECTION: ITimelineSelection = { layerIds: [], trackItemIds: [] };

/** UI-only Timeline panel state (PLAN.md 15.7) — zoom/scroll/selection, never project data. */
export const useTimelineStore = create<ITimelineState>((set) => ({
  zoomTicksPerPixel: 3,
  scrollPixels: 0,
  selection: EMPTY_SELECTION,
  setZoom: (zoomTicksPerPixel) => set({ zoomTicksPerPixel }),
  setScroll: (scrollPixels) => set({ scrollPixels }),
  select: (selection) => set({ selection }),
  clearSelection: () => set({ selection: EMPTY_SELECTION }),
}));
