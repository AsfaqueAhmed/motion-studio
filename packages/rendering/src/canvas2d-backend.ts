import { RenderBackend } from "@motion-studio/shared";
import { placeholderColor } from "./placeholder-color";
import type { IRenderBackend, IRenderTargetSize } from "./render-backend";
import { sortRenderQueue } from "./render-queue";
import type { ISceneGraph, ISceneGraphNode } from "./scene-graph";

/**
 * The subset of `CanvasRenderingContext2D` this backend actually calls —
 * kept minimal and hand-rolled (rather than depending on lib.dom's full
 * interface) so tests can inject a fake without a real `<canvas>`,
 * matching the dependency-injection pattern used by
 * `packages/storage/src/opfs-adapter.ts` for browser-only APIs.
 */
export interface ICanvas2DContext {
  save(): void;
  restore(): void;
  translate(x: number, y: number): void;
  rotate(radians: number): void;
  scale(x: number, y: number): void;
  clearRect(x: number, y: number, width: number, height: number): void;
  fillRect(x: number, y: number, width: number, height: number): void;
  globalAlpha: number;
  fillStyle: string;
}

export interface ICanvas2DBackendDependencies {
  getContext(): ICanvas2DContext;
}

/**
 * Canvas2D backend — the browser-support last resort before `Software`
 * (`05-rendering-engine/canvas-fallback.md`). Draws each Scene Graph node
 * as a flat, alpha-blended rect using the 2D context's own transform stack
 * (translate → rotate → scale, matching `ITransform2D`'s anchor-relative
 * convention).
 */
export class Canvas2DRenderBackend implements IRenderBackend {
  readonly kind = RenderBackend.Canvas2D;

  private readonly getContext: () => ICanvas2DContext;
  private context: ICanvas2DContext | null = null;
  private width = 0;
  private height = 0;

  constructor(dependencies: ICanvas2DBackendDependencies) {
    this.getContext = () => dependencies.getContext();
  }

  init(target: IRenderTargetSize): void {
    this.width = target.width;
    this.height = target.height;
    this.context = this.getContext();
  }

  drawFrame(sceneGraph: ISceneGraph): void {
    const ctx = this.requireContext();
    ctx.clearRect(0, 0, this.width, this.height);
    for (const node of sortRenderQueue(sceneGraph.nodes)) {
      this.drawNode(ctx, node);
    }
  }

  dispose(): void {
    this.context = null;
  }

  private drawNode(ctx: ICanvas2DContext, node: ISceneGraphNode): void {
    const { r, g, b } = placeholderColor(node.layerId);
    const { transform, bounds } = node;

    ctx.save();
    ctx.translate(transform.x, transform.y);
    ctx.rotate(transform.rotation);
    ctx.scale(transform.scaleX, transform.scaleY);
    ctx.globalAlpha = node.opacity;
    ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
    ctx.fillRect(
      bounds.x - transform.anchorX,
      bounds.y - transform.anchorY,
      bounds.width,
      bounds.height,
    );
    ctx.restore();
  }

  private requireContext(): ICanvas2DContext {
    if (!this.context) {
      throw new Error("Canvas2DRenderBackend: drawFrame called before init()");
    }
    return this.context;
  }
}
