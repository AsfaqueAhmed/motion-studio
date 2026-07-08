"use client";

import { useEffect, useRef, useState } from "react";
import { useDraggable } from "@dnd-kit/core";
import { Plus, Search } from "lucide-react";
import type { IAssetCatalogEntry } from "@motion-studio/assets";
import { AssetType } from "@motion-studio/shared";
import { useEditorKernel } from "../editor-kernel-provider";
import { useEngineRevisionStore } from "../../state/use-engine-revision-store";
import { THUMBNAIL_MIME_TYPE } from "../../editor-kernel/thumbnail-generator";
import type { EditorKernel } from "../../editor-kernel/editor-kernel";

const THUMBNAIL_TYPES = new Set<AssetType>([AssetType.Video, AssetType.Image]);

/** Fetches the asset's stored thumbnail (if any) and hands back an object URL, revoked on unmount/change. */
function useAssetThumbnailUrl(kernel: EditorKernel, entry: IAssetCatalogEntry): string | undefined {
  const [url, setUrl] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (!THUMBNAIL_TYPES.has(entry.type)) {
      return;
    }
    let cancelled = false;
    let objectUrl: string | undefined;
    kernel.assetEditor.getThumbnail(entry.id).then((data) => {
      if (cancelled || !data) {
        return;
      }
      objectUrl = URL.createObjectURL(
        new Blob([data as unknown as BlobPart], { type: THUMBNAIL_MIME_TYPE }),
      );
      setUrl(objectUrl);
    });
    return () => {
      cancelled = true;
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [kernel, entry.id, entry.type]);

  return url;
}

function AssetTile({
  entry,
  view,
}: {
  entry: IAssetCatalogEntry;
  view: "grid" | "list";
}): JSX.Element {
  const kernel = useEditorKernel();
  const thumbnailUrl = useAssetThumbnailUrl(kernel, entry);
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `asset-${entry.id}`,
    data: { type: "asset", assetId: entry.id, assetType: entry.type, name: entry.name },
  });

  // The floating `DragOverlay` in `EditorShell` renders the drag preview now,
  // so the source tile just hides — without this it stayed pinned via CSS
  // `transform` inside this panel's `overflow-y-auto`, clipping invisible
  // the moment the pointer left the panel.
  const style = { opacity: isDragging ? 0 : undefined };

  if (view === "list") {
    return (
      <div
        ref={setNodeRef}
        {...listeners}
        {...attributes}
        style={style}
        className="flex cursor-grab items-center gap-2 rounded-lg border border-editor-border bg-editor-surface-raised px-2 py-1 text-xs"
      >
        {thumbnailUrl ? (
          <img src={thumbnailUrl} alt="" className="h-6 w-6 shrink-0 rounded object-cover" />
        ) : null}
        <span className="truncate">{entry.name}</span>
        <span className="text-editor-text-muted">{entry.type}</span>
      </div>
    );
  }

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      style={style}
      className="relative flex aspect-square cursor-grab flex-col items-center justify-center gap-0.5 overflow-hidden rounded-lg border border-editor-border bg-editor-surface-raised p-1 text-center text-[10px]"
    >
      {thumbnailUrl ? (
        <img src={thumbnailUrl} alt="" className="absolute inset-0 h-full w-full object-cover" />
      ) : null}
      <div
        className={
          thumbnailUrl
            ? "relative mt-auto flex w-full flex-col gap-0.5 bg-black/60 px-1 py-0.5"
            : "flex flex-col gap-0.5"
        }
      >
        <span className="truncate">{entry.name}</span>
        <span className="text-editor-text-muted">{entry.type}</span>
      </div>
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
export function AssetBrowserPanel({ assetType }: { assetType?: AssetType }): JSX.Element {
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

  const filtered = entries
    .filter((entry) => !assetType || entry.type === assetType)
    .filter((entry) => entry.name.toLowerCase().includes(search.toLowerCase()));

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
    <div className="flex h-full flex-col gap-3 overflow-y-auto p-3 text-xs">
      <div className="flex items-center gap-2 rounded-lg border border-editor-border bg-editor-bg px-2 py-1.5">
        <Search className="h-3.5 w-3.5 text-editor-text-muted" aria-hidden />
        <input
          type="text"
          placeholder="Search assets…"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          className="w-full bg-transparent text-editor-text placeholder:text-editor-text-muted focus:outline-none"
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          title="Import"
          className="shrink-0 rounded p-1 text-editor-text-muted hover:bg-editor-surface-raised"
        >
          <Plus className="h-3.5 w-3.5" aria-hidden />
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
      </div>

      <div className="flex items-center gap-2 text-editor-text-muted">
        <label className="flex items-center gap-1">
          <input
            type="checkbox"
            checked={unusedOnly}
            onChange={(event) => setUnusedOnly(event.target.checked)}
          />
          Unused only
        </label>
        <button
          type="button"
          onClick={() => setView(view === "grid" ? "list" : "grid")}
          className="ml-auto rounded px-2 py-1 hover:bg-editor-surface-raised"
        >
          {view === "grid" ? "List" : "Grid"}
        </button>
      </div>

      <div className={view === "grid" ? "grid grid-cols-2 gap-2" : "flex flex-col gap-1"}>
        {filtered.map((entry) => (
          <AssetTile key={entry.id} entry={entry} view={view} />
        ))}
        {filtered.length === 0 && <span className="text-editor-text-muted">No assets</span>}
      </div>
    </div>
  );
}
