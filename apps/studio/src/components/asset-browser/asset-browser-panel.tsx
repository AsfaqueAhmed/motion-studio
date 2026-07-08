"use client";

import { useEffect, useRef, useState } from "react";
import { useDraggable } from "@dnd-kit/core";
import { Plus, Search, Trash2 } from "lucide-react";
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

/**
 * `AssetManager.delete` rejects if the asset still has TrackItem references
 * (`packages/assets/src/asset-manager.ts`) — `deleteSelection` never
 * unregisters those (ADR-010, cascade policy still open), so any asset
 * that's ever been dragged onto the Timeline hits this path forever, not
 * just transiently. Confirming and retrying with `force: true` is the
 * user's explicit per-operation override; the clip itself is left in place
 * (just loses its source), matching a typical media-bin's behavior.
 */
async function handleDeleteAsset(kernel: EditorKernel, entry: IAssetCatalogEntry): Promise<void> {
  try {
    await kernel.assetEditor.delete(entry.id);
    return;
  } catch (error) {
    if (!(error instanceof Error) || !error.message.includes("still referenced")) {
      console.error(`AssetBrowserPanel: failed to delete "${entry.name}"`, error);
      return;
    }
  }

  const confirmed = window.confirm(
    `"${entry.name}" is still used by a clip on the Timeline. Delete it anyway? The clip will stay but lose its source.`,
  );
  if (!confirmed) {
    return;
  }
  try {
    await kernel.assetEditor.delete(entry.id, { force: true });
  } catch (error) {
    console.error(`AssetBrowserPanel: failed to force-delete "${entry.name}"`, error);
  }
}

function DeleteButton({
  kernel,
  entry,
  className,
}: {
  kernel: EditorKernel;
  entry: IAssetCatalogEntry;
  className: string;
}): JSX.Element {
  return (
    <button
      type="button"
      title="Delete"
      // Stops the click/drag-start from reaching the tile's `useDraggable`
      // listeners on the parent — otherwise this button either starts a
      // drag instead of clicking, or both fire.
      onPointerDown={(event) => event.stopPropagation()}
      onClick={(event) => {
        event.stopPropagation();
        void handleDeleteAsset(kernel, entry);
      }}
      className={className}
    >
      <Trash2 className="h-3 w-3" aria-hidden />
    </button>
  );
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
    data: {
      type: "asset",
      assetId: entry.id,
      assetType: entry.type,
      name: entry.name,
      width: entry.width,
      height: entry.height,
    },
  });

  // The floating `DragOverlay` in `EditorShell` renders the drag preview
  // now, so the source tile just dims in place — without this it stayed
  // pinned via CSS `transform` inside this panel's `overflow-y-auto`,
  // clipping invisible the moment the pointer left the panel.
  const style = isDragging ? { opacity: 0.4, filter: "grayscale(0.5) brightness(0.7)" } : undefined;

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
        <DeleteButton
          kernel={kernel}
          entry={entry}
          className="ml-auto shrink-0 rounded p-1 text-editor-text-muted hover:bg-editor-bg hover:text-red-400"
        />
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
      <DeleteButton
        kernel={kernel}
        entry={entry}
        className="absolute right-1 top-1 rounded bg-black/60 p-1 text-white/80 hover:bg-black/80 hover:text-red-400"
      />
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
