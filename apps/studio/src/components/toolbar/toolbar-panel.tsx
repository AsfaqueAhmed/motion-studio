"use client";

import { useEffect, useState } from "react";
import { PlaybackState } from "@motion-studio/shared";
import { useEditorKernel } from "../editor-kernel-provider";
import { useCanvasStore } from "../../state/use-canvas-store";
import { useEngineRevisionStore } from "../../state/use-engine-revision-store";

/**
 * Renders the one built-in tool wired up this phase — Select, registered
 * through `createSelectToolPlugin()` at kernel startup and activated via
 * the same `IToolAPI` a third-party plugin would use (PLAN.md 15.6, "Tool
 * System"). Move/Hand/Zoom/Blade/... from `toolbar.md`'s built-ins list
 * aren't registered anywhere yet — there's exactly one tool to pick from.
 */
export function ToolbarPanel(): JSX.Element {
  const kernel = useEditorKernel();
  useEngineRevisionStore((state) => state.revision);
  const activeToolId = useCanvasStore(
    (state) => state.activeToolId ?? kernel.toolRegistry.activeTool,
  );
  const setActiveTool = useCanvasStore((state) => state.setActiveTool);
  const [isPlaying, setIsPlaying] = useState(
    kernel.playback.playbackState === PlaybackState.Playing,
  );

  useEffect(
    () =>
      kernel.playback.onTick(() =>
        setIsPlaying(kernel.playback.playbackState === PlaybackState.Playing),
      ),
    [kernel],
  );

  const activateSelectTool = (): void => {
    kernel.toolRegistry.activate("select");
    setActiveTool("select");
  };

  const togglePlayback = (): void => {
    if (isPlaying) {
      kernel.playback.pause();
      setIsPlaying(false);
    } else {
      kernel.playback.play();
      setIsPlaying(true);
    }
  };

  return (
    <header className="flex items-center gap-4 border-b border-editor-border bg-editor-surface px-4 py-2">
      <h1 className="text-sm font-semibold tracking-wide">Motion Studio</h1>

      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={activateSelectTool}
          aria-pressed={activeToolId === "select"}
          className={`rounded px-2 py-1 text-xs ${
            activeToolId === "select"
              ? "bg-editor-accent text-white"
              : "text-editor-text-muted hover:bg-editor-surface-raised"
          }`}
        >
          Select (V)
        </button>
      </div>

      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => kernel.commandBus.canUndo && kernel.commandBus.undo()}
          className="rounded px-2 py-1 text-xs text-editor-text-muted hover:bg-editor-surface-raised"
        >
          Undo
        </button>
        <button
          type="button"
          onClick={() => kernel.commandBus.canRedo && kernel.commandBus.redo()}
          className="rounded px-2 py-1 text-xs text-editor-text-muted hover:bg-editor-surface-raised"
        >
          Redo
        </button>
      </div>

      <button
        type="button"
        onClick={togglePlayback}
        className="ml-auto rounded bg-editor-surface-raised px-3 py-1 text-xs"
      >
        {isPlaying ? "Pause" : "Play"}
      </button>
    </header>
  );
}
