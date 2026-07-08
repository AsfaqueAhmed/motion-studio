"use client";

import {
  ChevronDown,
  Cloud,
  FolderClosed,
  MoreHorizontal,
  Redo2,
  ShieldCheck,
  Undo2,
  Upload,
  UserCircle2,
} from "lucide-react";
import { useEngineRevisionStore } from "../../state/use-engine-revision-store";
import { useCanvasStore } from "../../state/use-canvas-store";
import { useProjectStore } from "../../state/use-project-store";
import { useEditorKernel } from "../editor-kernel-provider";

/**
 * Top bar (CapCut-style reskin). The Select tool button that used to live
 * here is gone — it's still the sole registered tool and stays bound to the
 * `V` global shortcut (`EditorShell`'s `GLOBAL_BINDINGS`), it's just no
 * longer surfaced as a control since the reference chrome has nowhere for
 * it. Export/Shield/Folder/More/Avatar are decorative — none of that has a
 * real backing feature yet (no Export UI, no cloud sync, no auth).
 */
export function ToolbarPanel(): JSX.Element {
  const kernel = useEditorKernel();
  useEngineRevisionStore((state) => state.revision);
  const projectName = useProjectStore((state) => state.name);
  const zoomPercent = useCanvasStore((state) => Math.round(state.camera.zoom * 100));

  return (
    <header className="flex items-center gap-3 border-b border-editor-border bg-editor-surface px-3 py-2 text-xs">
      <Cloud className="h-4 w-4 text-editor-text-muted" aria-hidden />

      <button
        type="button"
        className="flex items-center gap-1 rounded px-2 py-1 hover:bg-editor-surface-raised"
      >
        <span className="font-medium">{projectName.toUpperCase()}</span>
        <ChevronDown className="h-3.5 w-3.5 text-editor-text-muted" aria-hidden />
      </button>

      <div className="h-4 w-px bg-editor-border" />

      <button
        type="button"
        className="flex items-center gap-1 rounded px-2 py-1 hover:bg-editor-surface-raised"
      >
        <span>{zoomPercent}%</span>
        <ChevronDown className="h-3.5 w-3.5 text-editor-text-muted" aria-hidden />
      </button>

      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => kernel.commandBus.canUndo && kernel.commandBus.undo()}
          title="Undo"
          className="rounded p-1.5 text-editor-text-muted hover:bg-editor-surface-raised"
        >
          <Undo2 className="h-4 w-4" aria-hidden />
        </button>
        <button
          type="button"
          onClick={() => kernel.commandBus.canRedo && kernel.commandBus.redo()}
          title="Redo"
          className="rounded p-1.5 text-editor-text-muted hover:bg-editor-surface-raised"
        >
          <Redo2 className="h-4 w-4" aria-hidden />
        </button>
      </div>

      <div className="ml-auto flex items-center gap-2">
        <button
          type="button"
          disabled
          title="Export — not wired up yet"
          className="flex items-center gap-1.5 rounded-full bg-editor-text px-3 py-1.5 font-semibold text-editor-bg opacity-60"
        >
          <Upload className="h-3.5 w-3.5" aria-hidden />
          EXPORT
        </button>
        <ShieldCheck className="h-4 w-4 text-editor-text-muted" aria-hidden />
        <FolderClosed className="h-4 w-4 text-editor-text-muted" aria-hidden />
        <MoreHorizontal className="h-4 w-4 text-editor-text-muted" aria-hidden />
        <UserCircle2 className="h-5 w-5 text-editor-text-muted" aria-hidden />
      </div>
    </header>
  );
}
