# Scene Graph

EPHEMERAL per-frame Scene Graph, rebuilt from Frame State and destroyed after each frame. See GLOSSARY.md: distinct from the persistent Composition Graph in 08-layer-engine.

## Implementation (`packages/rendering/src/scene-graph.ts`)

`ISceneGraphNode` is deliberately **flat** — no parent/child of its own.
Frame State layers already carry fully evaluated (Timeline + Animation
applied) local transforms, so hierarchy lives one layer up in the
persistent Composition Graph; Scene Graph nodes are just `{ layerId, type,
transform, opacity, zIndex, bounds, properties }`.

`buildSceneGraph(frameState): ISceneGraph` is a pure mapping —
`frameState.layers` → `sceneGraph.nodes`, carrying `tick`/`compositionId`/
`width`/`height` straight through.

`IFrameStateLayer` gained a `bounds: IBounds` field (local-space, pre-transform)
during this phase — the Scene Graph needs it for culling/dirty-rect and
there was nowhere else in `@motion-studio/shared` it could live. See
`packages/shared/src/frame-state.ts`.

## Dirty tracking (`SceneGraphDirtyTracker`)

Built on the generic `DirtyTrackedGraph<TId>` primitive
(`packages/shared/src/dirty-graph.ts`, ADR-005 #1). Since Scene Graph nodes
are flat, the accessor's parent/child edges are trivially empty — dirtiness
instead comes from **diffing successive Scene Graphs**: `update(sceneGraph)`
compares each node against the previous frame's node with the same
`layerId` (transform, opacity, zIndex, bounds, properties — shallow) and
calls `graph.markDirty(id)` for anything that changed or is new. Call
`update()` once per built Scene Graph, then query `isDirty`/
`queryDirtyVisible` for that frame.

## World-space bounds (`transform.ts`)

`worldBounds(bounds, transform)` applies the anchor → scale → rotate →
translate order (matching `ITransform2D`'s convention used across
Layer/Timeline/Animation) and returns an axis-aligned bounding box around
the (possibly rotated) result — sufficient for culling and dirty-rects, not
a true rotated rect.

## Open questions

- **Real pixel content.** Every backend today draws a flat placeholder
  color per node (`placeholder-color.ts`) instead of decoded video/image
  textures, rasterized text, or vector shape fills — those pipelines
  (Assets decode, text layout, shape tessellation) don't exist yet
  (Phases 8/9/12). Wiring real content in is additive: swap
  `placeholderColor(node.layerId)` for a real texture/paint lookup once
  those engines land.
- **Virtualization for Timeline UI / Canvas overlays.** `DirtyTrackedGraph`
  supports parent/child + viewport queries generically (`queryVisible`),
  but Rendering's own instantiation doesn't use that part (see above) —
  Timeline UI clip layout (Phase 15) is the first consumer that will need
  real parent/child + viewport culling together.
