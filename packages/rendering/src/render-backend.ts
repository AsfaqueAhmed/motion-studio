import type { RenderBackend } from "@motion-studio/shared";
import type { ISceneGraph } from "./scene-graph";

export interface IRenderTargetSize {
  readonly width: number;
  readonly height: number;
}

/**
 * The one GPU abstraction in the system (ADR-004) — Canvas overlays and
 * Timeline UI clip rendering are consumers of this, not independent
 * renderers. Every backend turns a Scene Graph into pixels the same way:
 * `init` once per target size, `drawFrame` once per Scene Graph, `dispose`
 * on teardown. Preview and Export both drive the same `IRenderBackend`
 * instance type so their output is guaranteed identical (ARCHITECTURE.md §4).
 */
export interface IRenderBackend {
  readonly kind: RenderBackend;
  init(target: IRenderTargetSize): Promise<void> | void;
  drawFrame(sceneGraph: ISceneGraph): Promise<void> | void;
  dispose(): Promise<void> | void;
}
