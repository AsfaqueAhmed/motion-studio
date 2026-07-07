"use client";

import { useEffect, useState, type MouseEvent } from "react";
import { useDraggable, useDroppable } from "@dnd-kit/core";
import {
  toTick,
  type LayerId,
  type Tick,
  type TrackId,
  type TrackItemId,
} from "@motion-studio/shared";
import { useEditorKernel } from "../editor-kernel-provider";
import { useTimelineStore } from "../../state/use-timeline-store";
import { useEngineRevisionStore } from "../../state/use-engine-revision-store";
import type { EditorKernel } from "../../editor-kernel/editor-kernel";

function TrackHeader({
  label,
  muted,
  locked,
}: {
  label: string;
  muted: boolean;
  locked: boolean;
}): JSX.Element {
  return (
    <div className="flex h-16 shrink-0 flex-col justify-center gap-0.5 border-b border-r border-editor-border bg-editor-surface px-2 text-xs">
      <span className="font-medium">{label}</span>
      <span className="text-editor-text-muted">
        {muted ? "Muted" : ""} {locked ? "Locked" : ""}
      </span>
    </div>
  );
}

function ClipBar({
  kernel,
  trackItemId,
  layerId,
  left,
  width,
  selected,
}: {
  kernel: EditorKernel;
  trackItemId: TrackItemId;
  layerId: LayerId;
  left: number;
  width: number;
  selected: boolean;
}): JSX.Element {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: `clip-${trackItemId}`,
    data: { type: "clip", trackItemId },
  });
  const layer = kernel.layerEngine.registry.get(layerId);
  const select = useTimelineStore((state) => state.select);

  const handleClick = (event: MouseEvent): void => {
    event.stopPropagation();
    select({ layerIds: layer ? [layer.id] : [], trackItemIds: [trackItemId] });
  };

  return (
    <button
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      type="button"
      onClick={handleClick}
      className={`absolute top-1 flex h-14 items-center overflow-hidden rounded border px-2 text-left text-xs ${
        selected
          ? "border-editor-accent bg-editor-accent/40"
          : "border-editor-border bg-editor-surface-raised"
      }`}
      style={{
        left,
        width: Math.max(width, 4),
        transform: transform ? `translate3d(${transform.x}px, 0, 0)` : undefined,
      }}
    >
      {layer?.name ?? "Clip"}
    </button>
  );
}

function TrackLane({
  kernel,
  trackId,
  ticksPerPixel,
  onScrub,
}: {
  kernel: EditorKernel;
  trackId: TrackId;
  ticksPerPixel: number;
  onScrub: (tick: Tick) => void;
}): JSX.Element {
  const { setNodeRef } = useDroppable({ id: `track-${trackId}`, data: { type: "track", trackId } });
  const selection = useTimelineStore((state) => state.selection);
  const items = kernel.timelineEngine.getTrackItemsSorted(trackId);

  const handleBackgroundClick = (event: MouseEvent<HTMLDivElement>): void => {
    const rect = event.currentTarget.getBoundingClientRect();
    onScrub(toTick((event.clientX - rect.left) * ticksPerPixel));
  };

  return (
    <div
      ref={setNodeRef}
      onClick={handleBackgroundClick}
      className="relative h-16 shrink-0 border-b border-editor-border"
    >
      {items.map((item) => (
        <ClipBar
          key={item.id}
          kernel={kernel}
          trackItemId={item.id}
          layerId={item.layerId}
          left={item.startTick / ticksPerPixel}
          width={item.durationTicks / ticksPerPixel}
          selected={selection.trackItemIds.includes(item.id)}
        />
      ))}
    </div>
  );
}

/**
 * Plain full render, no windowing — PLAN.md 15.3 asks for a virtualized
 * track/clip view, but track/item counts in this vertical slice are small
 * enough that windowing would add complexity with no observable benefit
 * yet. Real virtualization (reusing the generic `DirtyTrackedGraph`
 * primitive per ADR-005, same as the Rendering Engine's Scene Graph) is
 * deferred until a project actually has enough clips to need it.
 */
export function TimelinePanel(): JSX.Element {
  const kernel = useEditorKernel();
  useEngineRevisionStore((state) => state.revision);
  const zoomTicksPerPixel = useTimelineStore((state) => state.zoomTicksPerPixel);
  const setZoom = useTimelineStore((state) => state.setZoom);
  const [currentTick, setCurrentTick] = useState(kernel.playback.currentTick);

  useEffect(() => kernel.playback.onTick(setCurrentTick), [kernel]);

  const composition = kernel.timelineEngine.requireComposition(kernel.defaultCompositionId);

  return (
    <div className="flex flex-col overflow-hidden border-t border-editor-border bg-editor-bg">
      <div className="flex items-center gap-2 border-b border-editor-border px-2 py-1 text-xs text-editor-text-muted">
        <span>Tick {currentTick}</span>
        <label className="ml-auto flex items-center gap-1">
          Zoom
          <input
            type="range"
            min={1}
            max={20}
            value={zoomTicksPerPixel}
            onChange={(event) => setZoom(Number(event.target.value))}
          />
        </label>
      </div>
      <div className="flex flex-1 overflow-auto">
        <div className="flex shrink-0 flex-col">
          {composition.tracks.map((trackId) => {
            const track = kernel.timelineEngine.requireTrack(trackId);
            return (
              <TrackHeader
                key={trackId}
                label={track.label}
                muted={track.muted}
                locked={track.locked}
              />
            );
          })}
        </div>
        <div className="relative flex-1">
          <div
            className="pointer-events-none absolute inset-y-0 z-10 w-px bg-editor-accent"
            style={{ left: currentTick / zoomTicksPerPixel }}
          />
          <div className="flex flex-col">
            {composition.tracks.map((trackId) => (
              <TrackLane
                key={trackId}
                kernel={kernel}
                trackId={trackId}
                ticksPerPixel={zoomTicksPerPixel}
                onScrub={(tick) => kernel.playback.seek(tick)}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
