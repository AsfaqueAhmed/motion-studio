import { RenderBackend } from "@motion-studio/shared";
import {
  Canvas2DRenderBackend,
  SoftwareRenderBackend,
  WebGL2RenderBackend,
  WebGPURenderBackend,
  defaultCapabilityProbe,
  selectBackend,
  type ICanvas2DContext,
  type IGPUCanvasContext,
  type IGPUDevice,
  type IRenderBackend,
  type IWebGL2Context,
} from "@motion-studio/rendering";

/**
 * Constructs the real backend for `kind`, wiring the hand-rolled dependency
 * interfaces (`IWebGL2Context`/`IGPUDevice`/`IGPUCanvasContext`) to an
 * actual `<canvas>` — the "host app decision" `RenderingEngine`'s doc
 * comment defers to whoever has the real DOM/GPU handles. Every backend
 * draws the same placeholder-colored-rect content (`placeholder-color.ts`)
 * regardless of which one is picked — there's no real decoder pipeline
 * anywhere in the project yet (Phase 12), so WebGPU/WebGL2 buy correctness
 * of the rendering *pipeline*, not richer visuals, at this phase.
 */
async function createWebGPUBackend(canvas: HTMLCanvasElement): Promise<IRenderBackend> {
  const gpu = (navigator as unknown as { gpu?: { requestAdapter(): Promise<unknown> } }).gpu;
  if (!gpu) {
    throw new Error("createRenderBackend: navigator.gpu is unavailable");
  }
  const adapter = (await gpu.requestAdapter()) as {
    requestDevice(): Promise<IGPUDevice>;
  } | null;
  if (!adapter) {
    throw new Error("createRenderBackend: no WebGPU adapter available");
  }
  const device = await adapter.requestDevice();
  const canvasContext = canvas.getContext("webgpu") as unknown as IGPUCanvasContext | null;
  if (!canvasContext) {
    throw new Error('createRenderBackend: canvas.getContext("webgpu") returned null');
  }
  return new WebGPURenderBackend({
    getDevice: () => device,
    getCanvasContext: () => canvasContext,
  });
}

function createWebGL2Backend(canvas: HTMLCanvasElement): IRenderBackend {
  const gl = canvas.getContext("webgl2") as unknown as IWebGL2Context | null;
  if (!gl) {
    throw new Error('createRenderBackend: canvas.getContext("webgl2") returned null');
  }
  return new WebGL2RenderBackend({ getContext: () => gl });
}

function createCanvas2DBackend(canvas: HTMLCanvasElement): IRenderBackend {
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error('createRenderBackend: canvas.getContext("2d") returned null');
  }
  // `fillStyle` also accepts `CanvasGradient | CanvasPattern` on the real
  // context, which `ICanvas2DContext` (string-only, matching what this
  // backend actually assigns) intentionally doesn't model — safe to narrow.
  return new Canvas2DRenderBackend({ getContext: () => ctx as unknown as ICanvas2DContext });
}

/**
 * Picks the best backend via `selectBackend`'s WebGPU → WebGL2 → Canvas2D →
 * Software fallback chain, then falls one rung further down if actually
 * constructing/initializing the preferred backend throws (e.g. a browser
 * that reports `navigator.gpu` but fails `requestAdapter()`) — CLAUDE.md:
 * "Every feature that depends on a partial-support browser API needs an
 * explicit, tested fallback path."
 */
export async function createRenderBackend(canvas: HTMLCanvasElement): Promise<IRenderBackend> {
  const kind = selectBackend(defaultCapabilityProbe);

  if (kind === RenderBackend.WebGPU) {
    try {
      return await createWebGPUBackend(canvas);
    } catch {
      // fall through to WebGL2
    }
  }
  if (kind === RenderBackend.WebGPU || kind === RenderBackend.WebGL2) {
    try {
      return createWebGL2Backend(canvas);
    } catch {
      // fall through to Canvas2D
    }
  }
  try {
    return createCanvas2DBackend(canvas);
  } catch {
    return new SoftwareRenderBackend();
  }
}
