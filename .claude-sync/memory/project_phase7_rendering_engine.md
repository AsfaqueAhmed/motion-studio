---
name: project_phase7_rendering_engine
description: "Phase 7 Rendering Engine decisions — IRenderBackend + 4 backends, Scene Graph/dirty-tracking, Render Graph on Dag, deferred GPU texture eviction, repo-wide tsc -b --noEmit fix"
metadata: 
  node_type: memory
  type: project
  originSessionId: 14fe80d8-3c5b-4294-98cc-967a3b13847c
---

Phase 7 (Rendering Engine, `packages/rendering`) is complete as of 2026-07-07, built on branch `phase-7-rendering-engine` off `phase-6-animation-engine`.

**Key shapes:**
- `IRenderBackend` (`init/drawFrame/dispose`) with four real implementations: `WebGPURenderBackend` (real WGSL pipeline, hand-rolled `IGPUDevice`/`IGPUCanvasContext` — no `@webgpu/types` dep), `WebGL2RenderBackend` (real GLSL `#version 300 es`, hand-rolled `IWebGL2Context`), `Canvas2DRenderBackend` (hand-rolled `ICanvas2DContext`), and `SoftwareRenderBackend` (pure-JS RGBA framebuffer, no DOM/GPU — added beyond the original PLAN.md checklist specifically so Node/Vitest/CI has something fully real to render against and test).
- `selectBackend()` fallback chain: WebGPU → WebGL2 → Canvas2D → Software.
- Added two ADR-005 graph primitives to `@motion-studio/shared` this phase (previously only `Hierarchy` existed): `Dag<TId>` (primitive #3, cycle-detecting topological sort — backs `RenderGraph`) and `DirtyTrackedGraph<TId>` (primitive #1 — backs `SceneGraphDirtyTracker`).
- `IFrameStateLayer` gained a `bounds: IBounds` field (needed for Scene Graph culling/dirty-rect — didn't exist before).
- Content is placeholder-only: every backend draws a flat color per node (`placeholder-color.ts`) since no real decoded video/rasterized text/shape pipeline exists yet (Phases 8/9/12 own that).
- `RenderGraph` (on `Dag`) exists but isn't wired into any backend's `drawFrame` yet — every layer gets the identity chain since Effects Engine (Phase 8) hasn't landed.
- `TextureCache` deliberately has **no eviction** — GPU memory budget number is still genuinely open (CLAUDE.md hard risk #6). `DecodedFrameCache` (video frames) *does* evict, count-based, since that's plain JS heap not GPU memory.
- `color-space.ts` (`yuvToRgb` BT.601/BT.709) implemented but not wired to any backend yet — no real decoded video texture exists to convert.

**Pre-existing bug fixed this phase (not a regression from Phase 7 work):** `tsc -b --noEmit` is fundamentally incompatible with TypeScript project references whenever an upstream referenced project needs a real rebuild (TS6310 "Referenced project may not disable emit"). It silently affected every prior phase's `typecheck` script too but never surfaced because turbo's cache hid it. Fix: changed every package's `"typecheck"` script from `tsc -b --noEmit` to `tsc -b` (14 packages). See [[feedback_phase_branching]].

Full findings written into `docs/05-rendering-engine/*.md` (all previously stubs) and `PLAN.md` Phase 7 checklist / M6 milestone.
