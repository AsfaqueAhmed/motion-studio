import { create } from "zustand";

export interface IViewportCamera {
  readonly panX: number;
  readonly panY: number;
  readonly zoom: number;
}

interface ICanvasState {
  readonly camera: IViewportCamera;
  readonly activeToolId: string | undefined;
  readonly showOverlays: boolean;
  setCamera(camera: IViewportCamera): void;
  setActiveTool(toolId: string): void;
  toggleOverlays(): void;
}

/**
 * UI-only Canvas panel state. `ViewportCamera` (pan/zoom of the editing
 * surface) is never saved to the project — see GLOSSARY.md's
 * `ViewportCamera` vs. `SceneCamera` distinction.
 */
export const useCanvasStore = create<ICanvasState>((set) => ({
  camera: { panX: 0, panY: 0, zoom: 1 },
  activeToolId: undefined,
  showOverlays: true,
  setCamera: (camera) => set({ camera }),
  setActiveTool: (activeToolId) => set({ activeToolId }),
  toggleOverlays: () => set((state) => ({ showOverlays: !state.showOverlays })),
}));
