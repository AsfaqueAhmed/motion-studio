"use client";

import { useEffect, useRef, type PointerEvent as ReactPointerEvent } from "react";
import { RenderingEngine, worldBounds, type IRenderBackend } from "@motion-studio/rendering";
import type { IFrameState } from "@motion-studio/shared";
import { useEditorKernel } from "../editor-kernel-provider";
import { useCanvasStore } from "../../state/use-canvas-store";
import { useTimelineStore } from "../../state/use-timeline-store";
import { useEngineRevisionStore } from "../../state/use-engine-revision-store";
import { createRenderBackend } from "../../editor-kernel/render-backend-factory";
import { buildFrameState } from "../../editor-kernel/frame-state-builder";

/**
 * Hosts the real `RenderingEngine`/`IRenderBackend` pipeline
 * (`ARCHITECTURE.md` §4 Frame State → pixels) against an actual
 * `<canvas>`. `RenderingEngine`'s lifecycle is owned here, not by
 * `AppEngine` — it needs the real canvas element, which only exists once
 * this component mounts (see `EditorKernel`'s doc comment). Content is
 * placeholder colored rects (`placeholder-color.ts`) regardless of which
 * backend wins the fallback chain — no decoder pipeline exists anywhere in
 * the project yet.
 */
export function CanvasPanel(): JSX.Element {
  const kernel = useEditorKernel();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const overlayRef = useRef<HTMLCanvasElement>(null);
  const renderingEngineRef = useRef<RenderingEngine | null>(null);
  const backendRef = useRef<IRenderBackend | null>(null);
  const lastFrameStateRef = useRef<IFrameState | null>(null);
  const revision = useEngineRevisionStore((state) => state.revision);
  const selection = useTimelineStore((state) => state.selection);
  const select = useTimelineStore((state) => state.select);
  const showOverlays = useCanvasStore((state) => state.showOverlays);

  const composition = kernel.timelineEngine.requireComposition(kernel.defaultCompositionId);

  const renderCurrentFrame = (): void => {
    const engine = renderingEngineRef.current;
    if (!engine) {
      return;
    }
    const frameState = buildFrameState(
      kernel.playback.currentTick,
      kernel.defaultCompositionId,
      kernel.timelineEngine,
      kernel.layerEngine,
      kernel.animationEngine,
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
    for (const layer of frameState.layers) {
      if (!selection.layerIds.includes(layer.layerId)) {
        continue;
      }
      const box = worldBounds(layer.bounds, layer.transform);
      ctx.strokeRect(box.x, box.y, box.width, box.height);
    }
  };

  useEffect(() => {
    let cancelled = false;

    createRenderBackend(canvasRef.current!)
      .then(async (backend) => {
        if (cancelled) {
          await backend.dispose();
          return;
        }
        backendRef.current = backend;
        const engine = new RenderingEngine(backend);
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
    };
  }, [kernel]);

  // Re-subscribes on every dependency change so the tick listener's closure
  // never reads stale `selection`/`showOverlays` — cheap, since subscribing
  // is just a Set add/remove, and it also repaints immediately (covers a
  // Command executing, selection changing, or overlay toggle while paused).
  useEffect(() => {
    renderCurrentFrame();
    return kernel.playback.onTick(() => renderCurrentFrame());
  }, [kernel, revision, selection, showOverlays]);

  const handlePointerDown = (event: ReactPointerEvent<HTMLCanvasElement>): void => {
    const frameState = lastFrameStateRef.current;
    const canvas = overlayRef.current;
    if (!frameState || !canvas) {
      return;
    }
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = (event.clientX - rect.left) * scaleX;
    const y = (event.clientY - rect.top) * scaleY;

    const hit = [...frameState.layers]
      .sort((a, b) => b.zIndex - a.zIndex)
      .find((layer) => {
        const box = worldBounds(layer.bounds, layer.transform);
        return x >= box.x && x <= box.x + box.width && y >= box.y && y <= box.y + box.height;
      });

    select({ layerIds: hit ? [hit.layerId] : [], trackItemIds: [] });
  };

  return (
    <div className="flex items-center justify-center overflow-hidden bg-editor-bg p-4">
      <div
        className="relative"
        style={{
          aspectRatio: `${composition.width} / ${composition.height}`,
          maxHeight: "100%",
          maxWidth: "100%",
        }}
      >
        <canvas
          ref={canvasRef}
          width={composition.width}
          height={composition.height}
          className="absolute inset-0 h-full w-full rounded border border-editor-border bg-black"
        />
        <canvas
          ref={overlayRef}
          width={composition.width}
          height={composition.height}
          onPointerDown={handlePointerDown}
          className="absolute inset-0 h-full w-full"
        />
      </div>
    </div>
  );
}
