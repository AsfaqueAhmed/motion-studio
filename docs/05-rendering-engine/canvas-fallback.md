# Canvas Fallback

2D fallback for devices without WebGPU or WebGL2. Not the true last resort —
see `SoftwareRenderBackend` below for the headless case.

## Implementation (`packages/rendering/src/canvas2d-backend.ts`)

`Canvas2DRenderBackend implements IRenderBackend`. `ICanvas2DContext` is a
hand-rolled minimal interface (`save`/`restore`/`translate`/`rotate`/
`scale`/`clearRect`/`fillRect`/`globalAlpha`/`fillStyle`) rather than the
full lib.dom `CanvasRenderingContext2D`, so tests inject
`FakeCanvas2DContext` (`test-support/fake-canvas2d-context.ts`) instead of a
real `<canvas>`.

Draws each Scene Graph node using the context's own transform stack:
`save()` → `translate(transform.x, transform.y)` → `rotate(rotation)` →
`scale(scaleX, scaleY)` → `fillRect(bounds.x - anchorX, bounds.y -
anchorY, bounds.width, bounds.height)` → `restore()` — mirroring the same
anchor/scale/rotate/translate convention as `worldBounds` (`transform.ts`)
and the GPU backends' shaders.

## The `Software` backend — the actual last resort

`packages/rendering/src/software-backend.ts`'s `SoftwareRenderBackend` is a
pure-JS RGBA `Uint8ClampedArray` framebuffer with **no** canvas, GPU, or DOM
dependency at all — it works in plain Node. This is what backs headless CI
and this package's own Vitest suite (`RenderBackend.Software` in
`backend-detection.ts`'s fallback chain: WebGPU → WebGL2 → Canvas2D →
Software). `renderer-overview.md` originally scoped this as "Canvas2D (+
Software, for headless CI tests)" — implemented here as its own backend
class rather than a Canvas2D variant, since there's no `<canvas>` to draw
into at all in that environment.

## Open questions

- No text-rendering path yet (`fillText`/`measureText`) — text layers still
  draw as a placeholder-colored rect like every other layer type, pending
  the text-rendering pipeline (deferred, see `08-layer-engine/text-layer.md`).
