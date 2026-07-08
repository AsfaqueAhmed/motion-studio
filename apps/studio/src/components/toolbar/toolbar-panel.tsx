"use client";

import { useEffect, useRef, useState } from "react";
import {
  ChevronDown,
  ChevronLeft,
  Cloud,
  FolderClosed,
  MoreHorizontal,
  RectangleHorizontal,
  RectangleVertical,
  Redo2,
  ShieldCheck,
  SlidersHorizontal,
  Square,
  Undo2,
  Upload,
  UserCircle2,
  type LucideIcon,
} from "lucide-react";
import { useEngineRevisionStore } from "../../state/use-engine-revision-store";
import { useCanvasStore } from "../../state/use-canvas-store";
import { useProjectStore } from "../../state/use-project-store";
import { useEditorKernel } from "../editor-kernel-provider";
import type { EditorKernel } from "../../editor-kernel/editor-kernel";

interface IFramePreset {
  readonly label: string;
  readonly width: number;
  readonly height: number;
  readonly icon: LucideIcon;
}

const FRAME_PRESETS: readonly IFramePreset[] = [
  { label: "Landscape", width: 1920, height: 1080, icon: RectangleHorizontal },
  { label: "Portrait", width: 1080, height: 1920, icon: RectangleVertical },
  { label: "Square", width: 1080, height: 1080, icon: Square },
];

function matchingPreset(width: number, height: number): IFramePreset | undefined {
  return FRAME_PRESETS.find((preset) => preset.width === width && preset.height === height);
}

/**
 * Output frame size (`IComposition.width`/`height`) editor — a small
 * popover listing common presets (Landscape/Portrait/Square) plus a Custom
 * sub-view with raw width/height fields. Custom commits on blur/Enter
 * rather than per-keystroke `onChange`, unlike the Inspector's property
 * editors: typing "1080" digit-by-digit would otherwise push four separate
 * undo steps and briefly render at each invalid intermediate size (e.g.
 * width=1). Picking a preset commits immediately — there's no intermediate
 * state to protect against there.
 */
function FrameSizeControl({ kernel }: { kernel: EditorKernel }): JSX.Element {
  const composition = kernel.timelineEngine.requireComposition(kernel.defaultCompositionId);
  const [isOpen, setIsOpen] = useState(false);
  const [showCustom, setShowCustom] = useState(false);
  const [width, setWidth] = useState(String(composition.width));
  const [height, setHeight] = useState(String(composition.height));
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) {
      return;
    }
    setWidth(String(composition.width));
    setHeight(String(composition.height));
    setShowCustom(!matchingPreset(composition.width, composition.height));
    const handleOutsideClick = (event: MouseEvent): void => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, [isOpen, composition.width, composition.height]);

  const applyPreset = (preset: IFramePreset): void => {
    kernel.timelineEditor.setCompositionSize({
      type: "SetCompositionSize",
      payload: { compositionId: composition.id, width: preset.width, height: preset.height },
    });
    setIsOpen(false);
  };

  const commitCustom = (): void => {
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

  const active = matchingPreset(composition.width, composition.height);

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
        <div className="absolute left-0 top-full z-30 mt-1 w-44 rounded-lg border border-editor-border bg-editor-surface p-1 shadow-2xl shadow-black/50">
          {!showCustom ? (
            <div className="flex flex-col gap-0.5">
              {FRAME_PRESETS.map((preset) => (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() => applyPreset(preset)}
                  className={`flex items-center gap-2 rounded px-2 py-1.5 text-left hover:bg-editor-surface-raised ${
                    active?.label === preset.label ? "text-editor-accent" : ""
                  }`}
                >
                  <preset.icon className="h-3.5 w-3.5 shrink-0" aria-hidden />
                  <span className="flex-1">{preset.label}</span>
                  <span className="text-editor-text-muted">
                    {preset.width}×{preset.height}
                  </span>
                </button>
              ))}
              <button
                type="button"
                onClick={() => setShowCustom(true)}
                className={`flex items-center gap-2 rounded px-2 py-1.5 text-left hover:bg-editor-surface-raised ${
                  !active ? "text-editor-accent" : ""
                }`}
              >
                <SlidersHorizontal className="h-3.5 w-3.5 shrink-0" aria-hidden />
                <span className="flex-1">Custom</span>
                {!active && (
                  <span className="text-editor-text-muted">
                    {composition.width}×{composition.height}
                  </span>
                )}
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-2 p-1">
              <button
                type="button"
                onClick={() => setShowCustom(false)}
                className="flex items-center gap-1 text-editor-text-muted hover:text-editor-text"
              >
                <ChevronLeft className="h-3.5 w-3.5" aria-hidden />
                Custom
              </button>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={1}
                  value={width}
                  onChange={(event) => setWidth(event.target.value)}
                  onBlur={commitCustom}
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
                  onBlur={commitCustom}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.currentTarget.blur();
                    }
                  }}
                  className="w-16 rounded border border-editor-border bg-editor-bg px-1 py-0.5 text-editor-text"
                />
              </div>
            </div>
          )}
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
