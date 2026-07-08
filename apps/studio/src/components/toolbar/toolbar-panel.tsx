"use client";

import { useEffect, useRef, useState } from "react";
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
import type { EditorKernel } from "../../editor-kernel/editor-kernel";

/**
 * Output frame size (`IComposition.width`/`height`) editor — a small
 * popover so it doesn't need a dedicated dialog for two number fields.
 * Commits on blur/Enter rather than per-keystroke `onChange`, unlike the
 * Inspector's property editors: typing "1080" digit-by-digit would
 * otherwise push four separate undo steps and briefly render at each
 * invalid intermediate size (e.g. width=1).
 */
function FrameSizeControl({ kernel }: { kernel: EditorKernel }): JSX.Element {
  const composition = kernel.timelineEngine.requireComposition(kernel.defaultCompositionId);
  const [isOpen, setIsOpen] = useState(false);
  const [width, setWidth] = useState(String(composition.width));
  const [height, setHeight] = useState(String(composition.height));
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) {
      return;
    }
    setWidth(String(composition.width));
    setHeight(String(composition.height));
    const handleOutsideClick = (event: MouseEvent): void => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, [isOpen, composition.width, composition.height]);

  const commit = (): void => {
    const nextWidth = Math.round(Number(width));
    const nextHeight = Math.round(Number(height));
    if (
      Number.isFinite(nextWidth) &&
      nextWidth > 0 &&
      Number.isFinite(nextHeight) &&
      nextHeight > 0 &&
      (nextWidth !== composition.width || nextHeight !== composition.height)
    ) {
      kernel.timelineEditor.setCompositionSize({
        type: "SetCompositionSize",
        payload: { compositionId: composition.id, width: nextWidth, height: nextHeight },
      });
    } else {
      setWidth(String(composition.width));
      setHeight(String(composition.height));
    }
  };

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        title="Output frame size"
        className="flex items-center gap-1 rounded px-2 py-1 hover:bg-editor-surface-raised"
      >
        <span>
          {composition.width} × {composition.height}
        </span>
        <ChevronDown className="h-3.5 w-3.5 text-editor-text-muted" aria-hidden />
      </button>
      {isOpen && (
        <div className="absolute left-0 top-full z-30 mt-1 flex items-center gap-2 rounded-lg border border-editor-border bg-editor-surface p-2 shadow-2xl shadow-black/50">
          <input
            type="number"
            min={1}
            value={width}
            onChange={(event) => setWidth(event.target.value)}
            onBlur={commit}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.currentTarget.blur();
              }
            }}
            className="w-16 rounded border border-editor-border bg-editor-bg px-1 py-0.5 text-editor-text"
          />
          <span className="text-editor-text-muted">×</span>
          <input
            type="number"
            min={1}
            value={height}
            onChange={(event) => setHeight(event.target.value)}
            onBlur={commit}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.currentTarget.blur();
              }
            }}
            className="w-16 rounded border border-editor-border bg-editor-bg px-1 py-0.5 text-editor-text"
          />
        </div>
      )}
    </div>
  );
}

/**
 * Top bar (CapCut-style reskin). The Select tool button that used to live
 * here is gone — it's still the sole registered tool and stays bound to the
 * `V` global shortcut (`EditorShell`'s `GLOBAL_BINDINGS`), it's just no
 * longer surfaced as a control since the reference chrome has nowhere for
 * it. Export/Shield/Folder/More/Avatar are decorative — none of that has a
 * real backing feature yet (no Export UI, no cloud sync, no auth). The
 * `{width} × {height}` button next to the zoom-percent button is real
 * (`FrameSizeControl`) — it edits `IComposition.width`/`height` through
 * `TimelineEditorService`/`UpdateCompositionSizeCommand`, undoable like any
 * other project edit.
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

      <FrameSizeControl kernel={kernel} />

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
