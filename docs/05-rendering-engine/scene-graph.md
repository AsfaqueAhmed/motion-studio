# Scene Graph

EPHEMERAL per-frame Scene Graph, rebuilt from Frame State and destroyed after each frame. See GLOSSARY.md: distinct from the persistent Composition Graph in 08-layer-engine.

## Implementation (`packages/rendering/src/scene-graph.ts`)

`ISceneGraphNode` is deliberately **flat** — no parent/child of its own.
Frame State layers already carry fully evaluated (Timeline + Animation
applied) local transforms, so hierarchy lives one layer up in the
persistent Composition Graph; Scene Graph nodes are `{ layerId, type,
transform, opacity, zIndex, bounds, assetId, texture, properties }`.

`buildSceneGraph(frameState, textureProvider?): ISceneGraph` maps
`frameState.layers` → `sceneGraph.nodes`, carrying `tick`/`compositionId`/
`width`/`height` straight through. For a layer with an `assetId` (Image/
Video/Sticker/Audio), it calls the injected `ITextureSourceProvider.resolve`
(`texture-source.ts`) and attaches the result as `node.texture` — a
synchronous cache read; a miss returns `undefined` for that frame rather
than blocking, and the node falls back to the placeholder-color path until
resolution finishes. `RenderingEngine`'s constructor takes this provider
and passes it through on every `renderFrame` call. `packages/rendering`
itself stays DOM-decode-free — the actual `createImageBitmap`/`<video>`
decoding lives in `apps/studio`'s `TextureSourceResolver`, injected by
`CanvasPanel` (see `renderer-overview.md`).

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

- **Real pixel content — Image/Video only.** All four backends now draw
  real decoded content for Image/Video/Sticker/Audio layers when a texture
  resolves (`ITextureSource`: `image-source` for Canvas2D/WebGL2/WebGPU,
  `raw-rgba` for Software). Text/Shape/Group layers still draw a flat
  placeholder-colored rect (`placeholder-color.ts`) — those need their own
  intrinsic-size model and rasterization/tessellation pipeline first (text
  layout, shape tessellation; still not built).
- **Export path.** `frame-state-builder`/Scene Graph are shared between
  Preview and Export, but only `CanvasPanel` currently constructs a
  `TextureSourceResolver` and passes it to `RenderingEngine`. The Export
  Engine runs headless and doesn't wire one in yet — until it does, an
  exported video's Image/Video layers still render as placeholder rects,
  breaking the preview/export pixel-identity invariant for asset-backed
  layers specifically. Flagged, not fixed, here.
- **Virtualization for Timeline UI / Canvas overlays.** `DirtyTrackedGraph`
  supports parent/child + viewport queries generically (`queryVisible`),
  but Rendering's own instantiation doesn't use that part (see above) —
  Timeline UI clip layout (Phase 15) is the first consumer that will need
  real parent/child + viewport culling together.
