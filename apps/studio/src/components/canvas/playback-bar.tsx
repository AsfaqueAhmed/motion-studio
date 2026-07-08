"use client";

import { useEffect, useState } from "react";
import {
  Crop,
  Droplet,
  Minimize,
  Maximize,
  Pause,
  Play,
  Trash2,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { PlaybackState } from "@motion-studio/shared";
import { useEditorKernel } from "../editor-kernel-provider";
import {
  useTimelineStore,
  MIN_ZOOM_TICKS_PER_PIXEL,
  MAX_ZOOM_TICKS_PER_PIXEL,
} from "../../state/use-timeline-store";
import { formatTimecode } from "../../lib/format-timecode";

const ZOOM_STEP = 1;

function toggleCanvasStageFullscreen(): void {
  if (document.fullscreenElement) {
    document.exitFullscreen().catch(() => {
      // Nothing actionable if the browser refuses to exit.
    });
    return;
  }
  document
    .getElementById("canvas-stage")
    ?.requestFullscreen()
    .catch(() => {
      // Fullscreen can be denied by the browser (no user gesture, unsupported,
      // already fullscreen) — nothing actionable to do beyond letting it no-op.
    });
}

/**
 * Playback control strip under the Canvas (CapCut-style reskin). Play/Pause
 * and the timeline zoom slider used to live in `ToolbarPanel`/
 * `TimelinePanel`'s mini toolbars — moved here, same underlying state
 * (`kernel.playback`, `useTimelineStore`), no new behavior. Crop/Droplet/HDR
 * are decorative (no Effects/Rendering UI wiring exists for them yet);
 * Maximize genuinely toggles fullscreen on the canvas stage.
 */
export function PlaybackBar(): JSX.Element {
  const kernel = useEditorKernel();
  const zoomTicksPerPixel = useTimelineStore((state) => state.zoomTicksPerPixel);
  const setZoom = useTimelineStore((state) => state.setZoom);
  const selection = useTimelineStore((state) => state.selection);
  const clearSelection = useTimelineStore((state) => state.clearSelection);
  const [currentTick, setCurrentTick] = useState(kernel.playback.currentTick);
  const [isPlaying, setIsPlaying] = useState(
    kernel.playback.playbackState === PlaybackState.Playing,
  );
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(
    () =>
      kernel.playback.onTick(() => {
        setCurrentTick(kernel.playback.currentTick);
        setIsPlaying(kernel.playback.playbackState === PlaybackState.Playing);
      }),
    [kernel],
  );

  // Browsers also exit fullscreen outside any button click (Esc key, OS
  // gesture) — this keeps the icon in sync with those cases too, not just
  // the toggle button's own clicks.
  useEffect(() => {
    const handleFullscreenChange = (): void => {
      setIsFullscreen(document.fullscreenElement === document.getElementById("canvas-stage"));
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  const composition = kernel.timelineEngine.requireComposition(kernel.defaultCompositionId);

  const togglePlayback = (): void => {
    if (isPlaying) {
      kernel.playback.pause();
    } else {
      kernel.playback.play();
    }
  };

  const handleDelete = (): void => {
    if (selection.trackItemIds.length === 0) {
      return;
    }
    kernel.timelineEditor.deleteSelection({
      type: "DeleteSelection",
      payload: { trackItemIds: selection.trackItemIds },
    });
    clearSelection();
  };

  return (
    <div className="flex items-center justify-between border-t border-editor-border px-4 py-2 text-xs text-editor-text-muted">
      <div className="flex items-center gap-3">
        <Crop className="h-4 w-4" aria-hidden />
        <Droplet className="h-4 w-4" aria-hidden />
        <span className="rounded border border-editor-border px-1 text-[10px] font-semibold">
          HDR
        </span>
        <button
          type="button"
          onClick={toggleCanvasStageFullscreen}
          title={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
          className="rounded p-1 hover:bg-editor-surface-raised"
        >
          {isFullscreen ? (
            <Minimize className="h-4 w-4" aria-hidden />
          ) : (
            <Maximize className="h-4 w-4" aria-hidden />
          )}
        </button>
      </div>

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={togglePlayback}
          className="flex h-8 w-8 items-center justify-center rounded-full bg-editor-surface-raised text-editor-text"
        >
          {isPlaying ? (
            <Pause className="h-4 w-4" aria-hidden />
          ) : (
            <Play className="h-4 w-4" aria-hidden />
          )}
        </button>
        <span className="tabular-nums">
          {formatTimecode(currentTick, composition.fps)} |{" "}
          {formatTimecode(composition.durationTicks, composition.fps)}
        </span>
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          title="Zoom out"
          onClick={() => setZoom(Math.min(MAX_ZOOM_TICKS_PER_PIXEL, zoomTicksPerPixel + ZOOM_STEP))}
          className="rounded p-1 hover:bg-editor-surface-raised"
        >
          <ZoomOut className="h-4 w-4" aria-hidden />
        </button>
        <input
          type="range"
          min={MIN_ZOOM_TICKS_PER_PIXEL}
          max={MAX_ZOOM_TICKS_PER_PIXEL}
          value={zoomTicksPerPixel}
          onChange={(event) => setZoom(Number(event.target.value))}
          className="w-24"
        />
        <button
          type="button"
          title="Zoom in"
          onClick={() => setZoom(Math.max(MIN_ZOOM_TICKS_PER_PIXEL, zoomTicksPerPixel - ZOOM_STEP))}
          className="rounded p-1 hover:bg-editor-surface-raised"
        >
          <ZoomIn className="h-4 w-4" aria-hidden />
        </button>
        <button
          type="button"
          onClick={handleDelete}
          title="Delete selection"
          className="rounded p-1 hover:bg-editor-surface-raised"
        >
          <Trash2 className="h-4 w-4" aria-hidden />
        </button>
      </div>
    </div>
  );
}
