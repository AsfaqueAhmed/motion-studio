---
name: canvas-texture-pipeline
description: "Real image/video texture rendering (canvas-ui-refactoring branch) — ITextureSource/ITextureSourceProvider shape, per-backend upload strategy, TextureSourceResolver, WebGPU multi-node correctness risk found"
metadata: 
  node_type: memory
  type: project
  originSessionId: f401780d-99c8-4189-bd05-dc3a80368f65
---

Replaced the flat-placeholder-color-only rendering (every layer drew a solid
rect regardless of type — `placeholder-color.ts`, `frame-state-builder.ts`'s
hardcoded 200x200 `PLACEHOLDER_BOUNDS`) with real decoded content for
Image/Video/Sticker/Audio layers, across all 4 render backends, on branch
`canvas-ui-refactoring`.

**Why:** user reported the Canvas panel showing only a small colored square
instead of actual image/video content. Investigation found this was a
documented-but-unbuilt gap (PLAN.md §15.2/§7), not a bug — no decode-to-
texture pipeline existed anywhere. User explicitly chose the full-scope fix
(all 4 backends) over a Canvas2D-only or bounds-only partial fix.

**Key API shapes added** (see [[project_phase7_rendering_engine]] for the
pre-existing 4-backend architecture this builds on):
- `packages/rendering/src/texture-source.ts` — `ITextureSource` (discriminated
  union: `"image-source"` for Canvas2D/WebGL2/WebGPU carrying a
  `CanvasImageSource` + `isLive` flag, `"raw-rgba"` for Software carrying a
  `Uint8ClampedArray`) and `ITextureSourceProvider.resolve(assetId)`
  (synchronous cache read; miss → background warm, returns `undefined` for
  that frame — never blocks the render loop).
- `RenderingEngine` constructor now takes an optional `textureProvider`,
  passed through to `buildSceneGraph`. `ISceneGraphNode`/`IFrameStateLayer`
  gained `assetId`/`texture` fields.
- `AssetManager.getBytes(assetId)` added (catalog→blobStore composition,
  mirrors existing `delete()`). `IAssetCatalogEntry` gained
  `width`/`height: number | undefined` (Image/Video only), persisted in
  `import-pipeline.ts` from `IAssetMetadata` (previously extracted then
  discarded).
- `apps/studio/src/editor-kernel/texture-source-resolver.ts` —
  `TextureSourceResolver` (implements `ITextureSourceProvider`), the only
  DOM-decode-coupled piece (`createImageBitmap`/`<video>`, same pattern as
  the pre-existing one-shot `metadata-extractor.ts`/`thumbnail-generator.ts`,
  just kept alive). Owned by `CanvasPanel`, same lifecycle reasoning as
  `RenderingEngine` itself (needs a mounted `<canvas>`/DOM).
- `frame-state-builder.ts` gained an optional `dimensionsLookup` param
  (must stay synchronous) so asset-backed layers get real bounds instead of
  the placeholder box once resolved.

**Per-backend upload strategy** (`ITextureSource.isLive`): static images
upload once and cache forever; live `HTMLVideoElement` sources re-upload
every `drawFrame` call (texImage2D / copyExternalImageToTexture), since the
browser advances the decoded frame independently. WebGL2 adds a second
GLSL program (shares the flat pipeline's vertex-attrib buffer, just derives
`v_uv` from the unit quad — no second vertex buffer needed). WebGPU adds a
second WGSL pipeline + per-asset bind group (texture+sampler+uniform,
combined into one bind group since `layout:"auto"` requires all of a
group's bindings in one `createBindGroup` call).

**Discovered, not fixed** (flagged in `docs/05-rendering-engine/webgpu.md`
"Open questions", pre-existing before this change, not introduced by it):
WebGPU's per-node pattern (`queue.writeBuffer` then `pass.draw`, repeated in
a loop, with a single `queue.submit()` only after the whole loop) may not be
safe for scenes with >1 node under the real WebGPU queue-timeline model —
all `writeBuffer` calls happen before the one `submit`, so by spec every
draw in that submission could read only the *last* node's uniform data. Only
ever verified against a fake device that doesn't model queue timing; never
verified against a real GPU with multiple layers on screen. Worth checking
if the user notices multi-layer WebGPU scenes rendering with identical
transforms.

**Explicitly out of scope:** Text/Shape/Group layers (still no intrinsic-
size model — separate open item), Export Engine (doesn't wire a
`TextureSourceResolver`/`ITextureSourceProvider` in yet, so exported video
still shows placeholder rects for asset-backed layers — breaks
preview/export pixel-identity for that case specifically, flagged as a
follow-up), GPU texture eviction/LRU (still no memory budget number, same
accepted-risk posture as the pre-existing unused `TextureCache`).

**How to apply:** if resuming this work, check `docs/05-rendering-engine/`
(scene-graph.md, webgpu.md, webgl.md, canvas-fallback.md,
renderer-overview.md) — all updated with real findings, not stubs anymore.

## Follow-up: auto-fit + drag transform handles + a real stuck-frame bug

Same branch, follow-up work after the texture pipeline landed:

- **Auto-fit on drop**: a freshly dropped layer used to land at
  `DEFAULT_TRANSFORM` (x=0,y=0,scale=1) while `bounds` now reflects the
  asset's real pixel size — rendered pinned to the top-left corner at
  native resolution. Fixed by threading `assetWidth`/`assetHeight` (already
  synchronously on the Asset Browser's drag payload) through
  `AddClipFromAssetIntent` so `TimelineEditorService.addClipFromAsset`
  computes a contain-fit, centered transform (`anchorX/Y` = asset center,
  `x/y` = composition center) at layer-creation time. Applies to new drops
  only — not retroactive.
- **Corner-drag transform handles**: no Interaction Pipeline/Tool system
  exists (`PLAN.md` §15.6) — implemented directly in `canvas-panel.tsx`'s
  pointer handlers instead: 4 corner handles for uniform scale (projects
  pointer movement onto the original corner-to-corner diagonal for the
  scale factor, solves `translate` from `worldBounds`'s own
  `world=(local-anchor)*scale+translate` so the opposite corner stays
  fixed — only exact for `rotation===0`, no rotation handle yet) + drag-body
  to move. Live-drag mutates the layer in `layerEngine.registry` directly
  (ephemeral, not a Command) and commits once on pointerup via a new
  `InspectorEditorService.setLayerTransform` (batches multiple
  `UpdateLayerCommand`s into one `CompositeCommand` — one undo step, not
  four).
- **Real bug found via user report** ("scaling/positioning/rotation all
  messed up" even on a freshly-dropped layer): `TextureSourceResolver`
  decodes in the background with **no notification when it finishes**.
  `CanvasPanel` only re-renders on a Playhead tick or a Command Bus
  revision bump — a layer dropped while *paused* rendered once against a
  still-unresolved `getDimensions()` (falling back to `PLACEHOLDER_BOUNDS`)
  while its transform/anchor were already computed against the *real*
  dimensions, and then **never repainted again** to self-correct. Fixed by
  adding an `onResolved` callback to `TextureSourceResolver`'s constructor,
  invoked once decode settles; `CanvasPanel` passes `renderCurrentFrame`.
  **Lesson**: any async-resolve-then-cache pattern feeding a manually
  triggered render loop (not React state) needs an explicit "notify on
  settle" hook — a cache miss returning `undefined` and silently warming in
  the background is not enough by itself.
- Also fixed while investigating: the Inspector's rotation field had zero
  degrees↔radians conversion (`transform.rotation` is radians everywhere in
  the render math) — typing "90" applied ~5157° of rotation. Added a
  dedicated `"angle"` editor kind. And `handlePointerUp` now forces an
  immediate `renderCurrentFrame()` after committing, since relying solely
  on the async revision-store round trip left a window where a fast second
  drag could hit-test against a one-frame-stale `lastFrameStateRef`.
