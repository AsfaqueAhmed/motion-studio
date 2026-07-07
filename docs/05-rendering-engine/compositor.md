# Compositor

Render Graph: node-based effect/blend/mask pipeline feeding the GPU backend.

## Implementation (`packages/rendering/src/render-graph.ts`)

`RenderGraph` wraps the generic `Dag<TId>` primitive
(`packages/shared/src/dag.ts`, ADR-005 #3) — nodes are `{ id,
dependencyIds }`; `executionOrder(outputId)` returns the dependency-first
(inputs-before-outputs) order for one layer's chain (`Image → Blur →
Shadow → Mask → Blend → Output`), throwing `DagCycleError` if a chain
somehow cycles.

`buildIdentityRenderGraph(sceneGraph)` builds one output node per Scene
Graph layer with **zero** dependencies — there are no real effect nodes
yet (Effects Engine is Phase 8), so every layer's chain today is just
itself. This is the extension point: Phase 8 registers real effect nodes
as dependencies of a layer's output node (`getRenderGraphOutputNodeId(layerId)`),
and `executionOrder` will naturally resolve the full chain once they
exist.

**Distinct from `render-queue.ts`.** The Render Graph is the _per-layer_
effect-chain topology (this file); `sortRenderQueue` is the _cross-layer_
GPU-submission order (z-index → blend mode → opaque-before-transparent →
type) for one Scene Graph. A backend's `drawFrame` uses `sortRenderQueue`
today; once Phase 8 lands, each queued node's effect chain would also be
evaluated via `RenderGraph.executionOrder` before the final draw call.

## Open questions

- **Not yet wired into any backend's `drawFrame`.** All four backends
  (`software-backend.ts`, `canvas2d-backend.ts`, `webgl2-backend.ts`,
  `webgpu-backend.ts`) currently draw straight from `sortRenderQueue`
  without consulting a `RenderGraph` — because there are no effect nodes to
  execute yet, wiring it in now would be dead code. Do this when Phase 8
  adds the first real effect node.
- **Blend/mask node shapes.** `IRenderGraphNode` only carries
  `dependencyIds` today; how a Blur/Shadow/Mask/Blend node actually
  transforms pixel data (texture in, texture out?) isn't designed — that's
  Phase 8's job.
