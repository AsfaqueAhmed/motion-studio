import { RenderBackend } from "@motion-studio/shared";

/**
 * Capability checks, isolated behind an interface so tests can inject a
 * fake probe instead of relying on a real browser/GPU (there is none in
 * this package's Node-based Vitest environment). See
 * `05-rendering-engine/renderer-overview.md` fallback chain: WebGPU →
 * WebGL2 → Canvas2D, with `Software` as the last resort for headless
 * environments (CI, this test suite) where no canvas exists at all.
 */
export interface IBackendCapabilityProbe {
  hasWebGPU(): boolean;
  hasWebGL2(): boolean;
  hasCanvas2D(): boolean;
}

function hasGlobalNavigatorGpu(): boolean {
  return (
    typeof navigator !== "undefined" &&
    "gpu" in navigator &&
    (navigator as unknown as { gpu?: unknown }).gpu != null
  );
}

function canvasSupportsContext(contextId: "webgl2" | "2d"): boolean {
  if (typeof document === "undefined") {
    return false;
  }
  const canvas = document.createElement("canvas");
  return canvas.getContext(contextId) != null;
}

/** Real-world probe backed by `navigator`/`document`. Absent in Node — every check safely returns `false`. */
export const defaultCapabilityProbe: IBackendCapabilityProbe = {
  hasWebGPU: hasGlobalNavigatorGpu,
  hasWebGL2: () => canvasSupportsContext("webgl2"),
  hasCanvas2D: () => canvasSupportsContext("2d"),
};

/**
 * Picks the best available backend: WebGPU (primary) → WebGL2 (fallback,
 * GLSL — shaders are authored separately from WGSL, see
 * `05-rendering-engine/shader-system.md`) → Canvas2D (last resort) →
 * `Software` (headless environments with no canvas at all, e.g. this
 * package's own test suite and CI).
 */
export function selectBackend(
  probe: IBackendCapabilityProbe = defaultCapabilityProbe,
): RenderBackend {
  if (probe.hasWebGPU()) {
    return RenderBackend.WebGPU;
  }
  if (probe.hasWebGL2()) {
    return RenderBackend.WebGL2;
  }
  if (probe.hasCanvas2D()) {
    return RenderBackend.Canvas2D;
  }
  return RenderBackend.Software;
}
