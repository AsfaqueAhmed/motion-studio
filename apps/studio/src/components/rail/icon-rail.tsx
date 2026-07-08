"use client";

import {
  CaseSensitive,
  ChevronDown,
  ChevronUp,
  Captions,
  Film,
  FileText,
  Image as ImageIcon,
  LayoutGrid,
  Music2,
  Sticker,
  Wand2,
  type LucideIcon,
} from "lucide-react";
import { useRailStore, type RailTab } from "../../state/use-rail-store";

const TABS: { id: RailTab; label: string; icon: LucideIcon }[] = [
  { id: "videos", label: "Videos", icon: Film },
  { id: "photos", label: "Photos", icon: ImageIcon },
  { id: "audio", label: "Audio", icon: Music2 },
  { id: "text", label: "Text", icon: CaseSensitive },
  { id: "captions", label: "Captions", icon: Captions },
  { id: "transcript", label: "Transcript", icon: FileText },
  { id: "effects", label: "Effects", icon: Wand2 },
  { id: "stickers", label: "Stickers", icon: Sticker },
  { id: "format", label: "Format", icon: LayoutGrid },
];

/**
 * Left navigation rail (CapCut-style reskin). Purely a tab switcher over
 * `useRailStore` — `LeftPanel` owns what actually renders for each tab.
 */
export function IconRail(): JSX.Element {
  const activeTab = useRailStore((state) => state.activeTab);
  const setActiveTab = useRailStore((state) => state.setActiveTab);

  return (
    <nav className="flex w-16 shrink-0 flex-col items-center gap-2 overflow-y-auto bg-editor-rail py-2 text-editor-text">
      <ChevronUp className="h-4 w-4 text-editor-text-muted" aria-hidden />

      <h1 className="mb-1 flex flex-col items-center text-[9px] font-semibold leading-tight tracking-wide">
        <span>MOTION</span>
        <span>STUDIO</span>
      </h1>

      <div className="flex flex-col items-center gap-1">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => setActiveTab(id)}
            aria-pressed={activeTab === id}
            className={`flex w-14 flex-col items-center gap-1 rounded-lg px-1 py-2 text-[10px] ${
              activeTab === id
                ? "bg-editor-accent/20 text-editor-text"
                : "text-editor-text-muted hover:bg-editor-surface-raised"
            }`}
          >
            <Icon className="h-4 w-4" aria-hidden />
            {label}
          </button>
        ))}
      </div>

      <ChevronDown className="mt-auto h-4 w-4 text-editor-text-muted" aria-hidden />
    </nav>
  );
}
