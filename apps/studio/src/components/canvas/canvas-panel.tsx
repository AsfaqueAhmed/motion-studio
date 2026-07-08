"use client";

import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { RenderingEngine, worldBounds, type IRenderBackend } from "@motion-studio/rendering";
import {
  PlaybackState,
  ticksToSeconds,
  type IFrameState,
  type ITransform2D,
  type LayerId,
} from "@motion-studio/shared";
import { useEditorKernel } from "../editor-kernel-provider";
import { useCanvasStore } from "../../state/use-canvas-store";
import { useTimelineStore } from "../../state/use-timeline-store";
import { useEngineRevisionStore } from "../../state/use-engine-revision-store";
import { createRenderBackend } from "../../editor-kernel/render-backend-factory";
import { buildFrameState } from "../../editor-kernel/frame-state-builder";
import { TextureSourceResolver } from "../../editor-kernel/texture-source-resolver";

/** Screen-px hit radius / draw size for a corner handle, converted to canvas px via the same screen→canvas factor `handlePointerDown` already uses. */
const HANDLE_SCREEN_RADIUS_PX = 8;
const HANDLE_DRAW_HALF_SIZE_PX = 4;
/** Floor on a corner-drag's uniform scale factor so dragging past the opposite corner can't invert or zero the layer. */
const MIN_SCALE_FACTOR = 0.05;

interface IPoint {
  readonly x: number;
  readonly y: number;
}

type IDragState =
  | {
      readonly mode: "move";
      readonly layerId: LayerId;
      readonly startTransform: ITransform2D;
      readonly startPointerCanvas: IPoint;
    }
  | {
      readonly mode: "scale";
      readonly layerId: LayerId;
      readonly startTransform: ITransform2D;
      /** World-space position of the opposite (anchor) corner — held fixed for the whole drag. */
      readonly fixedCornerWorld: IPoint;
      /** That same corner's position in the layer's local (pre-transform) space. */
      readonly fixedCornerLocal: IPoint;
      /** The dragged corner's world position at drag start — defines the original diagonal the pointer's movement is projected onto. */
      readonly draggedCornerWorldStart: IPoint;
    };

/** TL, TR, BL, BR — index `i`'s opposite corner is always `3 - i`. Same order for a local (`layer.bounds`) or world (`worldBounds(...)`) box. */
function boxCorners(box: { x: number; y: number; width: number; height: number }): IPoint[] {
  return [
    { x: box.x, y: box.y },
    { x: box.x + box.width, y: box.y },
    { x: box.x, y: box.y + box.height },
    { x: box.x + box.width, y: box.y + box.height },
  ];
}

/**
 * Hosts the real `RenderingEngine`/`IRenderBackend` pipeline
 * (`ARCHITECTURE.md` §4 Frame State → pixels) against an actual
 * `<canvas>`. `RenderingEngine`'s lifecycle is owned here, not by
 * `AppEngine` — it needs the real canvas element, which only exists once
 * this component mounts (see `EditorKernel`'s doc comment). Image/Video
 * layers draw real decoded content via `TextureSourceResolver` (also owned
 * here, same DOM-lifecycle reasoning); every other layer type still draws a
 * placeholder colored rect (`placeholder-color.ts`) until Text/Shape/Group
 * layers get an intrinsic-size model of their own.
 *
 * Click-to-select, drag-the-body-to-move, and drag-a-corner-handle-to-scale
 * (uniform, aspect-locked) all live directly on this component's pointer
 * handlers rather than a real Tool/Interaction Pipeline — neither exists
 * yet (`PLAN.md` §15.6, `docs/17-ui/toolbar.md`), so this is a deliberately
 * scoped-down placeholder, same spirit as the AABB hit-test it already had.
 * No rotation handle yet, so the scale-drag math only accounts for
 * `rotation === 0`.
 */
export function CanvasPanel(): JSX.Element {
  const kernel = useEditorKernel();
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const overlayRef = useRef<HTMLCanvasElement>(null);
  const renderingEngineRef = useRef<RenderingEngine | null>(null);
  const backendRef = useRef<IRenderBackend | null>(null);
  const textureResolverRef = useRef<TextureSourceResolver | null>(null);
  const lastFrameStateRef = useRef<IFrameState | null>(null);
  const dragStateRef = useRef<IDragState | null>(null);
  const revision = useEngineRevisionStore((state) => state.revision);
  const selection = useTimelineStore((state) => state.selection);
  const select = useTimelineStore((state) => state.select);
  const showOverlays = useCanvasStore((state) => state.showOverlays);
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });

  const composition = kernel.timelineEngine.requireComposition(kernel.defaultCompositionId);

  // CSS `aspect-ratio` + `max-width/max-height: 100%` can't jointly solve
  // "fit within this box preserving ratio" the way `object-fit: contain`
  // does for replaced elements — browsers resolve width first (filling the
  // available space), derive height from the ratio, then clip it against
  // max-height without re-deriving width, so a non-square composition (or a
  // container that isn't already the right ratio) overflows one axis and
  // gets silently clipped by overflow-hidden instead of shrinking to fit.
  // Measuring the container and computing the frame's pixel size ourselves
  // (the same contain-fit math object-fit:contain does internally) is the
  // only way to actually center a same-ratio box inside it.
  useEffect(() => {
    const container = containerRef.current;
    if (!container) {
      return;
    }
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) {
        return;
      }
      const { width, height } = entry.contentRect;
      setContainerSize({ width, height });
    });
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  const scale =
    containerSize.width > 0 && containerSize.height > 0
      ? Math.min(containerSize.width / composition.width, containerSize.height / composition.height)
      : 0;
  const frameWidth = composition.width * scale;
  const frameHeight = composition.height * scale;

  const renderCurrentFrame = (): void => {
    const engine = renderingEngineRef.current;
    if (!engine) {
      return;
    }
    const textureResolver = textureResolverRef.current;
    textureResolver?.syncVideos(
      kernel.playback.playbackState === PlaybackState.Playing,
      ticksToSeconds(kernel.playback.currentTick, composition.fps),
    );
    const frameState = buildFrameState(
      kernel.playback.currentTick,
      kernel.defaultCompositionId,
      kernel.timelineEngine,
      kernel.layerEngine,
      kernel.animationEngine,
      (assetId) => textureResolver?.getDimensions(assetId),
    );
    lastFrameStateRef.current = frameState;
    void engine.renderFrame(frameState);
    drawOverlay(frameState);
  };

  const drawOverlay = (frameState: IFrameState): void => {
    const overlay = overlayRef.current;
    const ctx = overlay?.getContext("2d");
    if (!overlay || !ctx) {
      return;
    }
    ctx.clearRect(0, 0, overlay.width, overlay.height);
    if (!showOverlays) {
      return;
    }
    ctx.strokeStyle = "#5b8cff";
    ctx.lineWidth = 2;
    const singleSelected = selection.layerIds.length === 1;
    for (const layer of frameState.layers) {
      if (!selection.layerIds.includes(layer.layerId)) {
        continue;
      }
      const box = worldBounds(layer.bounds, layer.transform);
      ctx.strokeRect(box.x, box.y, box.width, box.height);
      if (singleSelected && scale > 0) {
        drawHandles(ctx, box);
      }
    }
  };

  /** Corner handles for a resize drag — only drawn for a single-layer selection (`drawOverlay`). */
  const drawHandles = (
    ctx: CanvasRenderingContext2D,
    box: ReturnType<typeof worldBounds>,
  ): void => {
    const half = HANDLE_DRAW_HALF_SIZE_PX / scale;
    ctx.fillStyle = "#5b8cff";
    for (const corner of boxCorners(box)) {
      ctx.fillRect(corner.x - half, corner.y - half, half * 2, half * 2);
    }
  };

  useEffect(() => {
    let cancelled = false;
    const textureResolver = new TextureSourceResolver(kernel.assetManager, () => {
      if (!cancelled) {
        renderCurrentFrame();
      }
    });
    textureResolverRef.current = textureResolver;

    createRenderBackend(canvasRef.current!)
      .then(async (backend) => {
        if (cancelled) {
          await backend.dispose();
          return;
        }
        backendRef.current = backend;
        const engine = new RenderingEngine(backend, textureResolver);
        await engine.setTarget({ width: composition.width, height: composition.height });
        renderingEngineRef.current = engine;
        renderCurrentFrame();
      })
      .catch((error: unknown) => {
        console.error("CanvasPanel: failed to create render backend", error);
      });

    return () => {
      cancelled = true;
      void renderingEngineRef.current?.dispose();
      renderingEngineRef.current = null;
      backendRef.current = null;
      textureResolver.dispose();
      textureResolverRef.current = null;
    };
  }, [kernel]);

  /** Screen (client) px → composition-pixel canvas space, same conversion `handlePointerDown` always used. Queries the DOM live, so it's never stale even from a listener attached on a previous render. */
  const canvasPointFromClient = (clientX: number, clientY: number): IPoint | undefined => {
    const canvas = overlayRef.current;
    if (!canvas) {
      return undefined;
    }
    const rect = canvas.getBoundingClientRect();
    return {
      x: (clientX - rect.left) * (canvas.width / rect.width),
      y: (clientY - rect.top) * (canvas.height / rect.height),
    };
  };

  /**
   * Live preview during an active drag: mutates the layer already sitting in
   * `layerEngine.registry` in place (same replace-the-object convention
   * `setLayerPropertyValue` uses) and repaints immediately, bypassing the
   * Command Bus entirely. Deliberate: this is ephemeral interaction state,
   * not yet a committed edit — `handlePointerUp` is what actually records
   * one undoable Command, once the gesture ends.
   */
  const handlePointerMove = (event: PointerEvent): void => {
    const dragState = dragStateRef.current;
    if (!dragState) {
      return;
    }
    const point = canvasPointFromClient(event.clientX, event.clientY);
    const layer = kernel.layerEngine.registry.get(dragState.layerId);
    if (!point || !layer) {
      return;
    }

    if (dragState.mode === "move") {
      layer.transform = {
        ...dragState.startTransform,
        x: dragState.startTransform.x + (point.x - dragState.startPointerCanvas.x),
        y: dragState.startTransform.y + (point.y - dragState.startPointerCanvas.y),
      };
    } else {
      const { fixedCornerWorld, fixedCornerLocal, draggedCornerWorldStart, startTransform } =
        dragState;
      const diagX = draggedCornerWorldStart.x - fixedCornerWorld.x;
      const diagY = draggedCornerWorldStart.y - fixedCornerWorld.y;
      const diagLenSq = diagX * diagX + diagY * diagY;
      if (diagLenSq === 0) {
        return;
      }
      // Project the pointer's vector from the fixed corner onto the
      // original diagonal — the ratio is the uniform scale factor, and
      // solving `world = (local - anchor) * scale + translate` for
      // `translate` (rotation is 0 for every layer this drag can act on)
      // keeps the fixed corner's world position exactly unchanged.
      const pointerVecX = point.x - fixedCornerWorld.x;
      const pointerVecY = point.y - fixedCornerWorld.y;
      const scaleFactor = Math.max(
        MIN_SCALE_FACTOR,
        (pointerVecX * diagX + pointerVecY * diagY) / diagLenSq,
      );
      const scaleX = startTransform.scaleX * scaleFactor;
      const scaleY = startTransform.scaleY * scaleFactor;
      layer.transform = {
        ...startTransform,
        scaleX,
        scaleY,
        x: fixedCornerWorld.x - (fixedCornerLocal.x - startTransform.anchorX) * scaleX,
        y: fixedCornerWorld.y - (fixedCornerLocal.y - startTransform.anchorY) * scaleY,
      };
    }
    renderCurrentFrame();
  };

  /** Restores the pre-drag transform, then dispatches exactly one batched Command — see `setLayerTransform`'s doc comment on why this needs to be one undo step, not several. */
  const handlePointerUp = (): void => {
    const dragState = dragStateRef.current;
    dragStateRef.current = null;
    if (!dragState) {
      return;
    }
    const layer = kernel.layerEngine.registry.get(dragState.layerId);
    if (!layer) {
      return;
    }
    const finalTransform = layer.transform;
    layer.transform = dragState.startTransform;

    kernel.inspectorEditor.setLayerTransform({
      type: "SetLayerTransform",
      payload: {
        layerId: dragState.layerId,
        transform:
          dragState.mode === "move"
            ? { x: finalTransform.x, y: finalTransform.y }
            : {
                x: finalTransform.x,
                y: finalTransform.y,
                scaleX: finalTransform.scaleX,
                scaleY: finalTransform.scaleY,
              },
      },
    });

    // `setLayerTransform` also bumps the revision store (async, via the
    // Command Bus's event → React state update), which would eventually
    // refresh `lastFrameStateRef` too — but not before the very next
    // gesture's `handlePointerDown` might already need it. A rapid second
    // drag right after this one otherwise hit-tests against a one-frame-
    // stale `lastFrameStateRef`, computing its own start transform from
    // data that doesn't reflect the commit that just happened.
    renderCurrentFrame();
  };

  // Re-subscribes on every dependency change so the tick listener's closure
  // never reads stale `selection`/`showOverlays` — cheap, since subscribing
  // is just a Set add/remove, and it also repaints immediately (covers a
  // Command executing, selection changing, or overlay toggle while paused).
  // The drag listeners live on `window` (not the overlay canvas) so a drag
  // that briefly leaves the canvas bounds mid-gesture keeps tracking.
  useEffect(() => {
    renderCurrentFrame();
    const unsubscribeTick = kernel.playback.onTick(() => renderCurrentFrame());
    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
    return () => {
      unsubscribeTick();
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };
  }, [kernel, revision, selection, showOverlays]);

  // The backend caches width/height inside init() (WebGPU bakes it into the
  // NDC-conversion uniform, Canvas2D uses it for clearRect) — the mount
  // effect above only calls it once, so a later frame size change (the
  // Toolbar's FrameSizeControl) needs its own re-init or the backend keeps
  // drawing at the old size onto a canvas element React has already resized.
  useEffect(() => {
    const engine = renderingEngineRef.current;
    if (!engine) {
      return;
    }
    void engine
      .setTarget({ width: composition.width, height: composition.height })
      .then(() => renderCurrentFrame());
  }, [composition.width, composition.height]);

  const handlePointerDown = (event: ReactPointerEvent<HTMLCanvasElement>): void => {
    const frameState = lastFrameStateRef.current;
    const point = canvasPointFromClient(event.clientX, event.clientY);
    if (!frameState || !point) {
      return;
    }

    if (selection.layerIds.length === 1 && scale > 0) {
      const selectedLayer = frameState.layers.find(
        (layer) => layer.layerId === selection.layerIds[0],
      );
      if (selectedLayer) {
        const worldCorners = boxCorners(worldBounds(selectedLayer.bounds, selectedLayer.transform));
        const handleRadius = HANDLE_SCREEN_RADIUS_PX / scale;
        const cornerIndex = worldCorners.findIndex(
          (corner) => Math.hypot(point.x - corner.x, point.y - corner.y) <= handleRadius,
        );
        const draggedCorner = worldCorners[cornerIndex];
        const fixedCorner = worldCorners[3 - cornerIndex];
        const fixedCornerLocal = boxCorners(selectedLayer.bounds)[3 - cornerIndex];
        if (draggedCorner && fixedCorner && fixedCornerLocal) {
          dragStateRef.current = {
            mode: "scale",
            layerId: selectedLayer.layerId,
            startTransform: { ...selectedLayer.transform },
            fixedCornerWorld: fixedCorner,
            fixedCornerLocal,
            draggedCornerWorldStart: draggedCorner,
          };
          return;
        }
      }
    }

    const hit = [...frameState.layers]
      .sort((a, b) => b.zIndex - a.zIndex)
      .find((layer) => {
        const box = worldBounds(layer.bounds, layer.transform);
        return (
          point.x >= box.x &&
          point.x <= box.x + box.width &&
          point.y >= box.y &&
          point.y <= box.y + box.height
        );
      });

    if (hit && selection.layerIds.includes(hit.layerId)) {
      dragStateRef.current = {
        mode: "move",
        layerId: hit.layerId,
        startTransform: { ...hit.transform },
        startPointerCanvas: point,
      };
    }

    select({ layerIds: hit ? [hit.layerId] : [], trackItemIds: [] });
  };

  return (
    <div
      ref={containerRef}
      className="flex flex-1 items-center justify-center overflow-hidden bg-editor-bg p-4"
    >
      <div className="relative" style={{ width: frameWidth, height: frameHeight }}>
        <canvas
          ref={canvasRef}
          width={composition.width}
          height={composition.height}
          className="absolute inset-0 h-full w-full rounded-2xl border border-editor-border bg-black shadow-2xl shadow-black/50"
        />
        <canvas
          ref={overlayRef}
          width={composition.width}
          height={composition.height}
          onPointerDown={handlePointerDown}
          className="absolute inset-0 h-full w-full rounded-2xl"
        />
      </div>
    </div>
  );
}
