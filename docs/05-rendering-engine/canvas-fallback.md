# Canvas Fallback

2D fallback for devices without WebGPU or WebGL2. Not the true last resort —
see `SoftwareRenderBackend` below for the headless case.

## Implementation (`packages/rendering/src/canvas2d-backend.ts`)

`Canvas2DRenderBackend implements IRenderBackend`. `ICanvas2DContext` is a
hand-rolled minimal interface (`save`/`restore`/`translate`/`rotate`/
`scale`/`clearRect`/`fillRect`/`drawImage`/`globalAlpha`/`fillStyle`) rather
than the full lib.dom `CanvasRenderingContext2D`, so tests inject
`FakeCanvas2DContext` (`test-support/fake-canvas2d-context.ts`) instead of a
real `<canvas>`.

Draws each Scene Graph node using the context's own transform stack:
`save()` → `translate(transform.x, transform.y)` → `rotate(rotation)` →
`scale(scaleX, scaleY)` → then either `drawImage(node.texture.source, ...)`
when a texture resolved, or the placeholder `fillRect(bounds.x - anchorX,
bounds.y - anchorY, bounds.width, bounds.height)` → `restore()` — mirroring
the same anchor/scale/rotate/translate convention as `worldBounds`
(`transform.ts`) and the GPU backends' shaders. Canvas2D is the natural
drop-in for real content: `drawImage` accepts the same `ImageBitmap`/
`HTMLVideoElement` the resolver already produces, no format conversion
needed.

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

## Software's texture path — raw RGBA, not `CanvasImageSource`

`SoftwareRenderBackend` has no canvas/GPU/DOM at all, so it can't call
`drawImage`/`texImage2D` — instead it nearest-neighbor samples a plain
`Uint8ClampedArray` (`ITextureSource`'s `raw-rgba` kind) per destination
pixel in `blendPixel`, same AABB-only fidelity `worldBounds` already
accepted for the placeholder-color path (not a true rotated-quad sample).
In practice `TextureSourceResolver` (browser-only) never produces a
`raw-rgba` source — it only exists in `apps/studio`, which is never paired
with `SoftwareRenderBackend` in a real browser (`selectBackend()` only
falls through to Software when WebGPU, WebGL2, _and_ Canvas2D all fail,
which doesn't happen in practice) or in headless Node (no DOM to decode
with at all). The sampling code path is real and unit-tested, but has no
live caller today — accepted, since Software is the fallback-of-last-resort
rung, not the interactive path.

## Open questions

- No text-rendering path yet (`fillText`/`measureText`) — text layers still
  draw as a placeholder-colored rect like every other layer type, pending
  the text-rendering pipeline (deferred, see `08-layer-engine/text-layer.md`).
