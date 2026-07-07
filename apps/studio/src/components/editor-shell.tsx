"use client";

import { useEffect } from "react";
import { DndContext, PointerSensor, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import {
  PlaybackState,
  secondsToTicks,
  toTick,
  type AssetId,
  type AssetType,
  type TrackId,
  type TrackItemId,
} from "@motion-studio/shared";
import { useEditorKernel } from "./editor-kernel-provider";
import { ToolbarPanel } from "./toolbar/toolbar-panel";
import { CanvasPanel } from "./canvas/canvas-panel";
import { TimelinePanel } from "./timeline/timeline-panel";
import { InspectorPanel } from "./inspector/inspector-panel";
import { AssetBrowserPanel } from "./asset-browser/asset-browser-panel";
import { useTimelineStore } from "../state/use-timeline-store";
import { useCanvasStore } from "../state/use-canvas-store";
import type { EditorKernel } from "../editor-kernel/editor-kernel";

const DEFAULT_CLIP_DURATION_SECONDS = 3;

type DragData =
  | { type: "asset"; assetId: AssetId; assetType: AssetType; name: string }
  | { type: "clip"; trackItemId: TrackItemId };

type DropData = { type: "track"; trackId: TrackId };

/**
 * Handles both drop targets a Timeline track accepts: a freshly dragged
 * Asset Browser tile (creates a Layer + TrackItem via
 * `TimelineEditorService.addClipFromAsset`) and an existing clip being
 * repositioned (`moveTrackItem`). One `DndContext` at the shell level so
 * both the Asset Browser and Timeline panels can participate without each
 * owning a separate drag pipeline (`toolbar.md`: "Canvas/Timeline UI ...
 * should consume this one pipeline, not each define their own").
 */
function handleDragEnd(kernel: EditorKernel, event: DragEndEvent): void {
  const overData = event.over?.data.current as DropData | undefined;
  const activeData = event.active.data.current as DragData | undefined;
  if (!overData || overData.type !== "track" || !activeData) {
    return;
  }
  const ticksPerPixel = useTimelineStore.getState().zoomTicksPerPixel;

  if (activeData.type === "asset") {
    const activeRect = event.active.rect.current.translated;
    const overRect = event.over?.rect;
    const pixelOffset = activeRect && overRect ? Math.max(0, activeRect.left - overRect.left) : 0;
    const composition = kernel.timelineEngine.requireComposition(kernel.defaultCompositionId);
    kernel.timelineEditor.addClipFromAsset({
      type: "AddClipFromAsset",
      payload: {
        trackId: overData.trackId,
        assetId: activeData.assetId,
        assetType: activeData.assetType,
        name: activeData.name,
        startTick: toTick(pixelOffset * ticksPerPixel),
        durationTicks: secondsToTicks(DEFAULT_CLIP_DURATION_SECONDS, composition.fps),
      },
    });
    return;
  }

  const trackItem = kernel.timelineEngine.requireTrackItem(activeData.trackItemId);
  const deltaTicks = toTick(event.delta.x * ticksPerPixel);
  const toStartTick = toTick(Math.max(0, trackItem.startTick + deltaTicks));
  // A plain click still fires `onDragEnd` with zero (or near-zero) movement
  // — the `PointerSensor` activation distance below filters out most of
  // these, but this guard is a cheap, load-bearing backstop: without it, a
  // no-op move gets pushed onto the undo stack on every click, and Undo
  // then reverts that no-op instead of whatever the user actually meant.
  if (overData.trackId === trackItem.trackId && toStartTick === trackItem.startTick) {
    return;
  }
  kernel.timelineEditor.moveTrackItem({
    type: "MoveTrackItem",
    payload: { trackItemId: activeData.trackItemId, toTrackId: overData.trackId, toStartTick },
  });
}

const GLOBAL_BINDINGS = [
  { key: "Delete", commandId: "DeleteSelection" },
  { key: "Backspace", commandId: "DeleteSelection" },
  { key: "Mod+Z", commandId: "Undo" },
  { key: "Mod+Shift+Z", commandId: "Redo" },
  { key: " ", commandId: "TogglePlayback" },
  { key: "V", commandId: "ActivateSelectTool" },
] as const;

function dispatchShortcutCommand(kernel: EditorKernel, commandId: string): void {
  switch (commandId) {
    case "DeleteSelection": {
      const { selection, clearSelection } = useTimelineStore.getState();
      kernel.timelineEditor.deleteSelection({
        type: "DeleteSelection",
        payload: { trackItemIds: selection.trackItemIds },
      });
      clearSelection();
      return;
    }
    case "Undo":
      if (kernel.commandBus.canUndo) {
        kernel.commandBus.undo();
      }
      return;
    case "Redo":
      if (kernel.commandBus.canRedo) {
        kernel.commandBus.redo();
      }
      return;
    case "TogglePlayback":
      if (kernel.playback.playbackState === PlaybackState.Playing) {
        kernel.playback.pause();
      } else {
        kernel.playback.play();
      }
      return;
    case "ActivateSelectTool":
      kernel.toolRegistry.activate("select");
      useCanvasStore.getState().setActiveTool("select");
      return;
    default:
      return;
  }
}

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) {
    return false;
  }
  return target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable;
}

/**
 * Fixed CSS grid — Toolbar, Timeline, Inspector, Asset Browser, Canvas each
 * in a static cell. No dockable Split/Stack/Panel tree, no floating panels,
 * no layout-undo (ADR-011) — `docs/17-ui/docking.md`'s real engine is
 * deferred to its own future pass (Phase 15 scope decision).
 */
export function EditorShell(): JSX.Element {
  const kernel = useEditorKernel();
  // Without an activation distance, `PointerSensor` starts a drag on the
  // very first pointermove, which swallows the click a plain selection tap
  // on a clip/asset tile needs — 4px matches dnd-kit's own recommended
  // default for this exact click-vs-drag ambiguity.
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

  useEffect(() => {
    for (const binding of GLOBAL_BINDINGS) {
      kernel.shortcuts.register({
        key: binding.key,
        commandId: binding.commandId,
        scope: "Global",
      });
    }

    const handleKeyDown = (event: KeyboardEvent): void => {
      if (isEditableTarget(event.target)) {
        return;
      }
      const commandId = kernel.shortcuts.resolve(event);
      if (!commandId) {
        return;
      }
      event.preventDefault();
      dispatchShortcutCommand(kernel, commandId);
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      for (const binding of GLOBAL_BINDINGS) {
        kernel.shortcuts.unregister(binding.key, "Global");
      }
    };
  }, [kernel]);

  return (
    <DndContext sensors={sensors} onDragEnd={(event) => handleDragEnd(kernel, event)}>
      <div className="grid h-screen grid-rows-[auto_1fr_260px] bg-editor-bg text-editor-text">
        <ToolbarPanel />
        <div className="grid grid-cols-[240px_1fr_280px] overflow-hidden">
          <AssetBrowserPanel />
          <CanvasPanel />
          <InspectorPanel />
        </div>
        <TimelinePanel />
      </div>
    </DndContext>
  );
}
