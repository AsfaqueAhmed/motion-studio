# WebGPU

Primary backend. WGSL shaders. Confirmed solid 2026 browser support.

## Implementation (`packages/rendering/src/webgpu-backend.ts`)

`WebGPURenderBackend implements IRenderBackend`. No `@webgpu/types`
dependency — `IGPUDevice`/`IGPUCanvasContext`/etc. are hand-rolled minimal
interfaces covering only the calls this backend makes (`createShaderModule`,
`createRenderPipeline`, `createBuffer`, `createBindGroup`,
`createCommandEncoder`, `createTexture`, `createSampler`,
`queue.writeBuffer`/`submit`/`copyExternalImageToTexture`). A real
`GPUDevice`/`GPUCanvasContext` satisfies these structurally; tests inject
`FakeWebGPUDevice`/`FakeGPUCanvasContext` (`test-support/fake-webgpu-context.ts`)
since there's no real GPU in this package's Node/Vitest environment.

**Pipeline shape:** one WGSL module (`WGSL_SHADER_SOURCE`) with a
`vs_main`/`fs_main` pair, a single unit-quad vertex buffer (`0,0 1,0 0,1
1,1`, drawn as `triangle-strip`), and one uniform buffer (64 bytes / 16
`f32`s: `canvasSize, translate, scale, rotation, _pad0, boundsOrigin,
boundsSize, color`) rewritten via `queue.writeBuffer` before each node's
`draw(4)` call. `layout: "auto"` lets WebGPU infer the bind group layout
from the shader, avoiding a hand-written `GPUBindGroupLayout` descriptor.

The vertex shader's math — `boundsOrigin + unitQuad * boundsSize`, then
scale → rotate → translate → NDC — mirrors `transform.ts`'s `worldBounds`
and `webgl2-backend.ts`'s GLSL exactly, so all three backends place a node
identically (mod each API's own coordinate/clip-space quirks).

## Textured pipeline

A second render pipeline (`TEXTURED_WGSL_SHADER_SOURCE`, own
vertex/fragment pair) samples a real `texture_2d<f32>` + `sampler` instead
of a flat `u.color`. Its bind group (group 0) combines three resources per
the `layout: "auto"` requirement that one `createBindGroup` call supply
every binding a shader declares for that group: `binding(0)` the textured
uniform buffer (48 bytes / 12 `f32`s: `canvasSize, translate, scale,
rotation, opacity, boundsOrigin, boundsSize` — no color), `binding(1)` a
single shared `sampler` (linear filter, clamp-to-edge, created once in
`init()`), `binding(2)` that asset's `texture_2d` view. Bind groups are
cached per `assetId` alongside the texture itself, since the bind group's
resource references stay valid across frames (a live-video texture's
_content_ changes via `copyExternalImageToTexture`, not its GPU object
identity). `drawFrame` now picks pipeline + bind group per node instead of
setting one pipeline once for the whole frame.

Texture upload uses `queue.copyExternalImageToTexture({ source },
{ texture }, { width, height })` — the real WebGPU API for `ImageBitmap`/
`HTMLVideoElement` sources, avoiding manual pixel extraction. The
destination texture is created with `TEXTURE_BINDING | COPY_DST |
RENDER_ATTACHMENT` usage — `RENDER_ATTACHMENT` is required by spec for
`copyExternalImageToTexture`'s destination, not just for something you'd
render into directly. Same upload-once-for-static /
re-upload-every-frame-for-live-video rule as `webgl2-backend.ts`.

Text/Shape/Group layers still draw through the flat pipeline
(`placeholderColor` tinted by opacity) — see `scene-graph.md` "Open
questions" for why.

## Open questions

- **Real GPU verification.** Everything here is verified against a fake
  device (call sequence: pipeline/buffer/bind-group creation once, one
  `writeBuffer` + `draw` per node, one `submit` per frame). It has not been
  run against a real `GPUDevice` in a browser — that's an E2E-test-level
  concern (Phase 16.3), not something Vitest in Node can cover.
- **Per-node bind groups vs. one shared uniform buffer.** Both the flat and
  textured pipelines rewrite one shared uniform buffer per node before each
  draw (simple, but forces the GPU to synchronize between draws), and all
  `writeBuffer` calls for a frame happen before that frame's single
  `submit()`. Per the WebGPU queue-timeline model this is only guaranteed
  correct if the GPU actually executes draws in the order their preceding
  `writeBuffer` was issued relative to `submit`; this has only been
  verified against a fake device that doesn't model queue timing, not a
  real browser with more than one node on screen at once. Flagged as an
  unverified correctness risk for multi-layer scenes, not something this
  phase's texture work introduced or fixed — the textured pipeline mirrors
  the flat pipeline's existing pattern for consistency. A production
  version would likely use a dynamic-offset uniform buffer or one bind
  group per node created up front, which would also close this gap —
  revisit once real profiling/verification data exists.
