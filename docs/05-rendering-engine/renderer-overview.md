# Rendering Engine — Overview

Turns an immutable **Frame State** (see `../GLOSSARY.md`) into pixels.
Deterministic: the same Frame State always produces the same output,
which is what lets preview and export share one pipeline.

## Owns

Frame State → (ephemeral, per-frame) Scene Graph → Render Graph → GPU
backend → Canvas. Culling, dirty rectangles, texture cache (LRU), render
queue sorting (z-index → blend → transparency → material) to minimize
GPU state changes.

## Never does

Import media, save projects, play audio, create keyframes, run AI,
manage the Timeline, own selection. It only ever receives a Frame State
and produces pixels — see `../DECISIONS.md` ADR-006 for why its
per-frame "Scene Graph" is a different thing from the persistent
Composition Graph in `../08-layer-engine/`.

## Backend abstraction (`IRenderBackend`)

```
Render Graph
     │
IRenderBackend
     │
 ┌───┼──────────────┐
 ▼   ▼               ▼
WebGPU WebGL2   Canvas2D (+ Software, for headless CI tests)
```

This is the **one** GPU abstraction in the system — Canvas overlays and
Timeline UI clip rendering are consumers of this, not independent
renderers (`../DECISIONS.md` ADR-004).

**Important constraint:** WebGPU (WGSL) and WebGL2 (GLSL) shaders are
not automatically shared. The Render Graph's _topology_ is
backend-agnostic; every effect's actual shader must be authored once per
backend. Budget for this — it roughly doubles the ongoing cost of
shipping a new visual effect. See `shader-system.md`.

## Implementation status (Phase 7, `packages/rendering`)

`IRenderBackend` (`render-backend.ts`) plus four implementations —
`WebGPURenderBackend`, `WebGL2RenderBackend`, `Canvas2DRenderBackend`,
`SoftwareRenderBackend` — selected via `selectBackend()`
(`backend-detection.ts`, injectable `IBackendCapabilityProbe` for testing).
`RenderingEngine` (`rendering-engine.ts`) is the `IEngine` facade: it owns
Frame State → Scene Graph (`buildSceneGraph`) → dirty-tracking
(`SceneGraphDirtyTracker`) → `backend.drawFrame`. See `scene-graph.md`,
`frame-rendering.md`, `compositor.md`, `webgpu.md`, `webgl.md`,
`canvas-fallback.md` for each piece's detail.

**Image/Video/Sticker/Audio layers now draw real decoded content** in all
four backends, via an injected `ITextureSourceProvider`
(`texture-source.ts`) that `RenderingEngine`'s constructor accepts and
`buildSceneGraph` calls per asset-backed node. The provider itself —
`apps/studio`'s `TextureSourceResolver` — is the only DOM-decode-coupled
piece; it's constructed and owned by `CanvasPanel` (same "needs a mounted
`<canvas>`/DOM" lifecycle reasoning as `RenderingEngine` itself), using the
same `createImageBitmap`/`<video>` browser-API patterns that already
existed one-shot in `apps/studio`'s asset metadata/thumbnail pipelines.
`packages/rendering` never imports DOM decode APIs directly — see
`scene-graph.md`. Text/Shape/Group layers still draw a flat placeholder
color per node (`placeholder-color.ts`) — those need their own intrinsic-size
model and rasterization/tessellation pipeline first (Phase 8/9 territory,
still not built). The Export Engine doesn't wire a texture provider in yet
either — see `scene-graph.md` "Open questions".

## Known gaps — resolved this phase

- **Color space handling** — `color-space.ts`'s `yuvToRgb(y, u, v,
standard)` implements BT.601/BT.709 full-range YUV→RGB conversion.
  **Not yet wired to any backend** — there's no real decoded video texture
  to convert yet (see above), so this is verified standalone (round-tripped
  against the BT.709 forward matrix in tests) but has no call site until
  video content lands.
- **GPU memory budget** — still genuinely open, see `gpu-memory.md`.
  `TextureCache` was built deliberately _without_ eviction because no
  budget number exists (CLAUDE.md "Known hard risks" #6) — this was a
  documented decision, not an oversight.
- **Incremental Frame State evaluation** — `SceneGraphDirtyTracker`
  (`scene-graph.md`) diffs successive Scene Graphs per-node instead of
  re-evaluating everything; see `frame-rendering.md` for what's still
  missing (dirty _rectangles_, viewport culling, load-testing at scale).

## Performance goals

1080p: 60fps. 4K preview: 30fps. GPU utilization target >90%, CPU <30%.
Never do a GPU→CPU→GPU round trip if avoidable.
