# WebGPU

Primary backend. WGSL shaders. Confirmed solid 2026 browser support.

## Implementation (`packages/rendering/src/webgpu-backend.ts`)

`WebGPURenderBackend implements IRenderBackend`. No `@webgpu/types`
dependency — `IGPUDevice`/`IGPUCanvasContext`/etc. are hand-rolled minimal
interfaces covering only the calls this backend makes (`createShaderModule`,
`createRenderPipeline`, `createBuffer`, `createBindGroup`,
`createCommandEncoder`, `queue.writeBuffer`/`submit`). A real
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

## Content is still placeholder

Every node draws `u.color` — the layer's `placeholderColor` tinted by
opacity — not real decoded/rasterized content. See `scene-graph.md` "Open
questions".

## Open questions

- **Real GPU verification.** Everything here is verified against a fake
  device (call sequence: pipeline/buffer/bind-group creation once, one
  `writeBuffer` + `draw` per node, one `submit` per frame). It has not been
  run against a real `GPUDevice` in a browser — that's an E2E-test-level
  concern (Phase 16.3), not something Vitest in Node can cover.
- **Per-node bind groups vs. one shared uniform buffer.** This
  implementation rewrites one uniform buffer per node before each draw
  (simple, but forces the GPU to synchronize between draws). A production
  version would likely use a dynamic-offset uniform buffer or one bind
  group per node created up front — revisit once real profiling data
  exists.
