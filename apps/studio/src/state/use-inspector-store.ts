import { create } from "zustand";

interface IInspectorState {
  readonly openSections: ReadonlySet<string>;
  toggleSection(section: string): void;
}

/** UI-only: which Inspector sections are expanded. Selected layer is derived from `useTimelineStore`'s selection, not duplicated here. */
export const useInspectorStore = create<IInspectorState>((set) => ({
  openSections: new Set(["transform", "properties"]),
  toggleSection: (section) =>
    set((state) => {
      const next = new Set(state.openSections);
      if (next.has(section)) {
        next.delete(section);
      } else {
        next.add(section);
      }
      return { openSections: next };
    }),
}));
