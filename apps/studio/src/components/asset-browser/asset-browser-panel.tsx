"use client";

import { useEffect, useRef, useState } from "react";
import { useDraggable } from "@dnd-kit/core";
import type { IAssetCatalogEntry } from "@motion-studio/assets";
import { useEditorKernel } from "../editor-kernel-provider";
import { useEngineRevisionStore } from "../../state/use-engine-revision-store";

function AssetTile({
  entry,
  view,
}: {
  entry: IAssetCatalogEntry;
  view: "grid" | "list";
}): JSX.Element {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: `asset-${entry.id}`,
    data: { type: "asset", assetId: entry.id, assetType: entry.type, name: entry.name },
  });

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      style={{
        transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
      }}
      className={
        view === "grid"
          ? "flex aspect-square cursor-grab flex-col items-center justify-center rounded border border-editor-border bg-editor-surface-raised p-1 text-center text-[10px]"
          : "flex cursor-grab items-center gap-2 rounded border border-editor-border bg-editor-surface-raised px-2 py-1 text-xs"
      }
    >
      <span className="truncate">{entry.name}</span>
      <span className="text-editor-text-muted">{entry.type}</span>
    </div>
  );
}

/**
 * Thin UI view over `AssetManager` (ADR-002) — no registry of its own.
 * `list()`/`listUnused()` are async, so this keeps local component state
 * refetched on `useEngineRevisionStore` bumps (`AssetImported`/
 * `AssetDeleted`), unlike the sync engines other panels read straight
 * through selectors.
 */
export function AssetBrowserPanel(): JSX.Element {
  const kernel = useEditorKernel();
  const revision = useEngineRevisionStore((state) => state.revision);
  const [entries, setEntries] = useState<IAssetCatalogEntry[]>([]);
  const [view, setView] = useState<"grid" | "list">("grid");
  const [search, setSearch] = useState("");
  const [unusedOnly, setUnusedOnly] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let cancelled = false;
    const load = unusedOnly ? kernel.assetEditor.listUnused() : kernel.assetEditor.list();
    load.then((result) => {
      if (!cancelled) {
        setEntries(result);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [kernel, revision, unusedOnly]);

  const filtered = entries.filter((entry) =>
    entry.name.toLowerCase().includes(search.toLowerCase()),
  );

  const handleImport = async (files: FileList | null): Promise<void> => {
    if (!files) {
      return;
    }
    for (const file of Array.from(files)) {
      const data = new Uint8Array(await file.arrayBuffer());
      try {
        await kernel.assetEditor.import({ fileName: file.name, mimeType: file.type, data });
      } catch (error) {
        console.error(`AssetBrowserPanel: failed to import "${file.name}"`, error);
      }
    }
  };

  return (
    <aside className="flex flex-col gap-2 overflow-y-auto border-r border-editor-border bg-editor-surface p-2 text-xs">
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="rounded bg-editor-surface-raised px-2 py-1"
        >
          Import
        </button>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="hidden"
          onChange={(event) => {
            void handleImport(event.target.files);
            event.target.value = "";
          }}
        />
        <button
          type="button"
          onClick={() => setView(view === "grid" ? "list" : "grid")}
          className="ml-auto rounded px-2 py-1 text-editor-text-muted hover:bg-editor-surface-raised"
        >
          {view === "grid" ? "List" : "Grid"}
        </button>
      </div>

      <input
        type="text"
        placeholder="Search assets…"
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        className="rounded border border-editor-border bg-editor-bg px-1 py-0.5"
      />

      <label className="flex items-center gap-1 text-editor-text-muted">
        <input
          type="checkbox"
          checked={unusedOnly}
          onChange={(event) => setUnusedOnly(event.target.checked)}
        />
        Unused only
      </label>

      <div className={view === "grid" ? "grid grid-cols-2 gap-2" : "flex flex-col gap-1"}>
        {filtered.map((entry) => (
          <AssetTile key={entry.id} entry={entry} view={view} />
        ))}
        {filtered.length === 0 && <span className="text-editor-text-muted">No assets</span>}
      </div>
    </aside>
  );
}
