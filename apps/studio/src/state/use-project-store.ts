import type { CompositionId } from "@motion-studio/shared";
import { create } from "zustand";

interface IProjectState {
  readonly name: string;
  readonly dirty: boolean;
  readonly activeCompositionId: CompositionId | undefined;
  setActiveComposition(id: CompositionId): void;
  markDirty(): void;
}

/**
 * UI-only project metadata (PLAN.md 15.7). There's no Project
 * Service/persistence yet (deferred, see `createEditorKernel`'s doc
 * comment) — `dirty` only reflects "a command executed since load," it
 * isn't wired to an actual save flow.
 */
export const useProjectStore = create<IProjectState>((set) => ({
  name: "Untitled Composition",
  dirty: false,
  activeCompositionId: undefined,
  setActiveComposition: (activeCompositionId) => set({ activeCompositionId }),
  markDirty: () => set({ dirty: true }),
}));
