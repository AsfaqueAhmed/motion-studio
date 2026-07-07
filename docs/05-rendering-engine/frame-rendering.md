# Frame Rendering

Culling, dirty rectangles, render queue sorting by z-index/blend/material.

## Render queue sorting (`packages/rendering/src/render-queue.ts`)

`sortRenderQueue(nodes)` orders a Scene Graph's nodes for GPU submission:
**z-index → blend mode → opaque-before-transparent → layer type** (today's
stand-in for "material" — every `LayerType` will eventually need its own
shader/pipeline). Grouping by these keys instead of z-index alone minimizes
GPU pipeline/state changes between consecutive draw calls. Blend mode is
read from a node's `properties["blendMode"]` bag (defaults to `"normal"`)
since there's no dedicated Effects data model yet (Phase 8).

## Dirty tracking / incremental evaluation

See `scene-graph.md`'s `SceneGraphDirtyTracker` — the "Frame State
evaluation must be incremental" requirement from `renderer-overview.md` is
addressed there: successive Scene Graphs are diffed per-node (shallow
comparison of transform/opacity/zIndex/bounds/properties) rather than
re-evaluating everything every frame.

## Culling

`DirtyTrackedGraph.queryVisible`/`queryDirtyVisible`
(`packages/shared/src/dirty-graph.ts`) support viewport-intersection
queries generically, but no backend calls them yet — every backend today
draws every Scene Graph node unconditionally (see `drawFrame` in
`software-backend.ts`/`canvas2d-backend.ts`/`webgl2-backend.ts`/
`webgpu-backend.ts`). Real culling needs a concrete viewport rect from the
Canvas UI (Phase 15), which doesn't exist yet.

## Open questions

- **Dirty rectangles** (only repainting the changed screen region, not the
  whole canvas) aren't implemented — `SceneGraphDirtyTracker` tells you
  _which nodes_ changed, but no backend uses that to limit its clear/redraw
  region. `Software`/`Canvas2D` clear+redraw the whole frame every call.
- **5,000+ visible objects at 60fps** (the stated performance goal in
  `renderer-overview.md`) hasn't been load-tested — there's no real content
  pipeline yet to generate a composition anywhere near that scale.
