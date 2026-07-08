"use client";

import { AssetType } from "@motion-studio/shared";
import { useRailStore } from "../../state/use-rail-store";
import { AssetBrowserPanel } from "../asset-browser/asset-browser-panel";
import { EffectsBrowserPanel } from "./effects-browser-panel";
import { ComingSoonPanel } from "./coming-soon-panel";

const LABELS: Record<string, string> = {
  text: "Text",
  captions: "Captions",
  transcript: "Transcript",
  stickers: "Stickers",
  format: "Format",
};

function LeftPanelContent(): JSX.Element {
  const activeTab = useRailStore((state) => state.activeTab);

  switch (activeTab) {
    case "videos":
      return <AssetBrowserPanel assetType={AssetType.Video} />;
    case "photos":
      return <AssetBrowserPanel assetType={AssetType.Image} />;
    case "audio":
      return <AssetBrowserPanel assetType={AssetType.Audio} />;
    case "effects":
      return <EffectsBrowserPanel />;
    default:
      return <ComingSoonPanel label={LABELS[activeTab] ?? activeTab} />;
  }
}

export function LeftPanel(): JSX.Element {
  return (
    <aside className="w-72 shrink-0 overflow-hidden border-r border-editor-border bg-editor-surface">
      <LeftPanelContent />
    </aside>
  );
}
