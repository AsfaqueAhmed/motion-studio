import { create } from "zustand";

interface IEngineRevisionState {
  readonly revision: number;
  bump(): void;
}

/**
 * The one bridge from the Event Bus to React re-renders (PLAN.md 15.7:
 * "Project data ... is not in Zustand ... read via selectors"). Components
 * don't store Layers/TrackItems/Keyframes here — they call
 * `useEngineRevisionStore` to know *when* to re-read the engines directly
 * (`layerEngine.registry.get(id)`, `timelineEngine.getTrackItemsSorted(...)`,
 * etc.), then do so via a plain function call in render, not a cached copy.
 */
export const useEngineRevisionStore = create<IEngineRevisionState>((set) => ({
  revision: 0,
  bump: () => set((state) => ({ revision: state.revision + 1 })),
}));
