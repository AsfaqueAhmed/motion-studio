import { create } from "zustand";

export type RailTab =
  | "videos"
  | "photos"
  | "audio"
  | "text"
  | "captions"
  | "transcript"
  | "effects"
  | "stickers"
  | "format";

interface IRailState {
  readonly activeTab: RailTab;
  setActiveTab(tab: RailTab): void;
}

/** UI-only: which left-rail tab drives the content panel next to it. */
export const useRailStore = create<IRailState>((set) => ({
  activeTab: "effects",
  setActiveTab: (activeTab) => set({ activeTab }),
}));
