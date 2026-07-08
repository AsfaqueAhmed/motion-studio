"use client";

import {
  useEffect,
  useRef,
  useState,
  type MouseEvent,
  type PointerEvent as ReactPointerEvent,
  type RefObject,
} from "react";
import { useDraggable, useDroppable } from "@dnd-kit/core";
import {
  Film,
  Music2,
  Sticker,
  Type,
  Volume2,
  VolumeX,
  Wand2,
  type LucideIcon,
} from "lucide-react";
import {
  ticksPerSecond,
  toTick,
  TrackType,
  type LayerId,
  type Tick,
  type TrackId,
  type TrackItemId,
} from "@motion-studio/shared";
import { useEditorKernel } from "../editor-kernel-provider";
import {
  useTimelineStore,
  MIN_ZOOM_TICKS_PER_PIXEL,
  MAX_ZOOM_TICKS_PER_PIXEL,
} from "../../state/use-timeline-store";
import { useEngineRevisionStore } from "../../state/use-engine-revision-store";
import type { EditorKernel } from "../../editor-kernel/editor-kernel";

/** ticksPerPixel change per unit of wheel `deltaY` — tuned so a mouse notch (~100) and a trackpad tick (~4-10) both feel responsive across the 1-20 zoom range. */
const ZOOM_WHEEL_SENSITIVITY = 0.02;

const TRACK_ICON: Partial<Record<TrackType, LucideIcon>> = {
  [TrackType.Video]: Film,
  [TrackType.Audio]: Music2,
  [TrackType.Text]: Type,
  [TrackType.Sticker]: Sticker,
  [TrackType.Effect]: Wand2,
};

const CHIP_STYLE: Partial<Record<TrackType, string>> = {
  [TrackType.Video]: "bg-chip-video-bg text-chip-video-text",
  [TrackType.Audio]: "bg-chip-audio-bg text-chip-audio-text",
  [TrackType.Text]: "bg-chip-text-bg text-chip-text-text",
  [TrackType.Effect]: "bg-chip-effect-bg text-chip-effect-text",
};
const DEFAULT_CHIP_STYLE = "bg-chip-default-bg text-chip-default-text";

const NICE_SECOND_INTERVALS = [1, 2, 5, 10, 15, 30, 60, 120, 300, 600];
const LARGEST_RULER_INTERVAL_SECONDS =
  NICE_SECOND_INTERVALS[NICE_SECOND_INTERVALS.length - 1] ?? 600;
const MIN_RULER_MARK_SPACING_PX = 80;

function pad(value: number): string {
  return value.toString().padStart(2, "0");
}

function formatRulerLabel(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = Math.floor(totalSeconds % 60);
  return `${pad(minutes)}:${pad(seconds)}`;
}

function pickRulerIntervalSeconds(zoomTicksPerPixel: number, fps: number): number {
  const perSecond = ticksPerSecond(fps);
  return (
    NICE_SECOND_INTERVALS.find(
      (seconds) => (seconds * perSecond) / zoomTicksPerPixel >= MIN_RULER_MARK_SPACING_PX,
    ) ?? LARGEST_RULER_INTERVAL_SECONDS
  );
}

function TimelineRuler({
  durationTicks,
  zoomTicksPerPixel,
  fps,
}: {
  durationTicks: Tick;
  zoomTicksPerPixel: number;
  fps: number;
}): JSX.Element {
  const intervalSeconds = pickRulerIntervalSeconds(zoomTicksPerPixel, fps);
  const perSecond = ticksPerSecond(fps);
  const intervalTicks = intervalSeconds * perSecond;
  const marks: number[] = [];
  for (let tick = 0; tick <= durationTicks; tick += intervalTicks) {
    marks.push(tick);
  }

  return (
    <div className="relative h-6 shrink-0 border-b border-editor-border text-[10px] text-editor-text-muted">
      {marks.map((tick) => (
        <span key={tick} className="absolute top-1" style={{ left: tick / zoomTicksPerPixel }}>
          {formatRulerLabel(tick / perSecond)}
        </span>
      ))}
    </div>
  );
}

function TrackHeader({ type, muted }: { type: TrackType; muted: boolean }): JSX.Element {
  const Icon = TRACK_ICON[type] ?? Film;
  const MuteIcon = muted ? VolumeX : Volume2;

  return (
    <div className="flex h-16 w-10 shrink-0 flex-col items-center justify-center gap-1 border-b border-r border-editor-border bg-editor-surface">
      <Icon className="h-3.5 w-3.5 text-editor-text-muted" aria-hidden />
      <MuteIcon
        className="h-3.5 w-3.5 text-editor-text-muted"
        aria-label={muted ? "Muted" : "Unmuted"}
      />
    </div>
  );
}

function ClipBar({
  kernel,
  trackItemId,
  layerId,
  trackType,
  left,
  width,
  selected,
}: {
  kernel: EditorKernel;
  trackItemId: TrackItemId;
  layerId: LayerId;
  trackType: TrackType;
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
  const Icon = TRACK_ICON[trackType] ?? Film;

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
      className={`absolute top-1 flex h-14 items-center gap-1 overflow-hidden rounded-lg px-2 text-left text-xs ${
        CHIP_STYLE[trackType] ?? DEFAULT_CHIP_STYLE
      } ${selected ? "ring-2 ring-editor-accent" : ""}`}
      style={{
        left,
        width: Math.max(width, 4),
        transform: transform ? `translate3d(${transform.x}px, 0, 0)` : undefined,
      }}
    >
      <Icon className="h-3 w-3 shrink-0 opacity-70" aria-hidden />
      {layer?.name ?? "Clip"}
    </button>
  );
}

function TrackLane({
  kernel,
  trackId,
  trackType,
  ticksPerPixel,
  onScrub,
}: {
  kernel: EditorKernel;
  trackId: TrackId;
  trackType: TrackType;
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
          trackType={trackType}
          left={item.startTick / ticksPerPixel}
          width={item.durationTicks / ticksPerPixel}
          selected={selection.trackItemIds.includes(item.id)}
        />
      ))}
    </div>
  );
}

function Playhead({
  trackAreaRef,
  currentTick,
  zoomTicksPerPixel,
  onSeek,
}: {
  trackAreaRef: RefObject<HTMLDivElement>;
  currentTick: Tick;
  zoomTicksPerPixel: number;
  onSeek: (tick: Tick) => void;
}): JSX.Element {
  const seekFromClientX = (clientX: number): void => {
    const rect = trackAreaRef.current?.getBoundingClientRect();
    if (!rect) {
      return;
    }
    onSeek(toTick(Math.max(0, (clientX - rect.left) * zoomTicksPerPixel)));
  };

  const handlePointerDown = (event: ReactPointerEvent<HTMLDivElement>): void => {
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    seekFromClientX(event.clientX);
  };

  const handlePointerMove = (event: ReactPointerEvent<HTMLDivElement>): void => {
    if (!event.currentTarget.hasPointerCapture(event.pointerId)) {
      return;
    }
    seekFromClientX(event.clientX);
  };

  return (
    <div
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      className="absolute inset-y-0 z-10 w-3 -translate-x-1/2 cursor-ew-resize"
      style={{ left: currentTick / zoomTicksPerPixel }}
    >
      <div className="pointer-events-none absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-editor-accent" />
      <div className="pointer-events-none absolute left-1/2 top-0 h-3 w-3 -translate-x-1/2 rounded-sm bg-editor-accent" />
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
  const [currentTick, setCurrentTick] = useState(kernel.playback.currentTick);
  const trackAreaRef = useRef<HTMLDivElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  useEffect(() => kernel.playback.onTick(setCurrentTick), [kernel]);

  // Ctrl+wheel (also how browsers report trackpad pinch) zooms, matching every
  // other timeline editor's convention — plain wheel keeps scrolling this
  // panel's own track list, which multi-track projects need. Attached as a
  // real, non-passive DOM listener rather than JSX `onWheel`: React registers
  // its synthetic wheel/touch listeners as passive at the root, so
  // `preventDefault()` inside a React onWheel handler is silently a no-op —
  // the browser's native pinch/ctrl+wheel page zoom fires anyway.
  useEffect(() => {
    const element = scrollAreaRef.current;
    if (!element) {
      return;
    }
    const handleWheel = (event: WheelEvent): void => {
      if (!event.ctrlKey) {
        return;
      }
      event.preventDefault();
      const state = useTimelineStore.getState();
      state.setZoom(
        Math.min(
          MAX_ZOOM_TICKS_PER_PIXEL,
          Math.max(
            MIN_ZOOM_TICKS_PER_PIXEL,
            state.zoomTicksPerPixel + event.deltaY * ZOOM_WHEEL_SENSITIVITY,
          ),
        ),
      );
    };
    element.addEventListener("wheel", handleWheel, { passive: false });
    return () => element.removeEventListener("wheel", handleWheel);
  }, []);

  // Safari doesn't route trackpad pinch through ctrlKey `wheel` events at
  // all — it recognizes the pinch gesture itself and fires its own
  // (non-standard, WebKit-only) gesture events, which the page-zoom default
  // rides along on regardless of what the `wheel` listener above does.
  useEffect(() => {
    const element = scrollAreaRef.current;
    if (!element) {
      return;
    }
    const preventGesture: EventListener = (event) => event.preventDefault();
    element.addEventListener("gesturestart", preventGesture);
    element.addEventListener("gesturechange", preventGesture);
    element.addEventListener("gestureend", preventGesture);
    return () => {
      element.removeEventListener("gesturestart", preventGesture);
      element.removeEventListener("gesturechange", preventGesture);
      element.removeEventListener("gestureend", preventGesture);
    };
  }, []);

  const composition = kernel.timelineEngine.requireComposition(kernel.defaultCompositionId);

  return (
    <div className="flex h-64 flex-col overflow-hidden border-t border-editor-border bg-editor-bg">
      <div ref={scrollAreaRef} className="flex flex-1 overflow-auto">
        <div className="flex shrink-0 flex-col">
          <div className="h-6 shrink-0 border-b border-r border-editor-border bg-editor-surface" />
          {composition.tracks.map((trackId) => {
            const track = kernel.timelineEngine.requireTrack(trackId);
            return <TrackHeader key={trackId} type={track.type} muted={track.muted} />;
          })}
        </div>
        <div ref={trackAreaRef} className="relative flex-1">
          <TimelineRuler
            durationTicks={composition.durationTicks}
            zoomTicksPerPixel={zoomTicksPerPixel}
            fps={composition.fps}
          />
          <Playhead
            trackAreaRef={trackAreaRef}
            currentTick={currentTick}
            zoomTicksPerPixel={zoomTicksPerPixel}
            onSeek={(tick) => kernel.playback.seek(tick)}
          />
          <div className="flex flex-col">
            {composition.tracks.map((trackId) => {
              const track = kernel.timelineEngine.requireTrack(trackId);
              return (
                <TrackLane
                  key={trackId}
                  kernel={kernel}
                  trackId={trackId}
                  trackType={track.type}
                  ticksPerPixel={zoomTicksPerPixel}
                  onScrub={(tick) => kernel.playback.seek(tick)}
                />
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
