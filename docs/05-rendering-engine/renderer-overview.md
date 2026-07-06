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

## Known gaps to close before implementation

- **Color space handling is currently unspecified.** Video decoded via
  WebCodecs needs explicit YUV→working-space conversion or you get
  visibly wrong (washed-out/oversaturated) output composited against
  correctly-colored text/shapes. This needs its own section before
  building the compositor.
- **GPU memory budget has no concrete number** — "never exceed budget"
  needs an actual ceiling for the LRU eviction policy to trigger against.
- **Frame State evaluation must be incremental**, not a full
  re-evaluation every frame, to hit 60fps with 5,000+ visible objects —
  not yet designed in detail.

## Performance goals

1080p: 60fps. 4K preview: 30fps. GPU utilization target >90%, CPU <30%.
Never do a GPU→CPU→GPU round trip if avoidable.
