# Overview

`packages/effects` produces `IEffectNode` data consumed by the Rendering
Engine's `RenderGraph` (`packages/rendering/src/render-graph.ts`) — it does
not execute effects itself and has no dependency on `@motion-studio/rendering`
(CLAUDE.md "Engine ownership": Effects never imports another engine's
concrete classes). `IEffectNode` (`effect-node.ts`) is deliberately shaped
to structurally satisfy `IRenderGraphNode` (`id` + `dependencyIds`) without
importing it:

```ts
export interface IEffectNode {
  readonly id: EffectNodeId;
  readonly type: EffectType;
  readonly dependencyIds: readonly EffectNodeId[]; // inputs
  readonly wgsl: string; // this node's output, as a WGSL fragment function
  readonly glsl: string; // the same output, as a GLSL #version 300 es function
  readonly cssFilter?: string; // Canvas2D/CSS fallback fragment, if expressible
}
```

Every effect factory in this package is a pure function: params in,
`IEffectNode` (or an ordered array of nodes, for multi-stage effects) out.
Numeric params are baked directly into the generated shader source as
`const`s rather than left as runtime uniforms — there is no backend wiring
yet to feed these nodes real uniform buffers (Rendering's `RenderGraph` is
"not wired into any backend's `drawFrame` yet", per
`05-rendering-engine/compositor.md`), so compile-time specialization is the
only real option today. When that wiring lands, it can either keep baking
per-node source (recompiling on param change) or extend the interface with
an explicit uniform-buffer layout — an open decision, not resolved here.

## Effect chain ordering

Multi-stage effects (Glow, Drop Shadow) return an array of `IEffectNode`s in
dependency order. `effect-chain.ts`'s `orderEffectChain` re-derives that
order from arbitrary `IEffectNode[]` input using the shared `Dag` primitive
(ADR-005 #3) — the same primitive `RenderGraph` uses for its own execution
order. This is a second, independent instantiation of `Dag`, not a new graph
type: Effects orders its own nodes to validate/preview a chain before
handing it to Rendering, which re-orders (or reuses) them once inserted into
the real `RenderGraph`.

## Two-input nodes

Every effect here has exactly one input (`dependencyIds.length === 1`)
except **Blend Mode** (`[bottomId, topId]`) and **Transition**
(`[fromId, toId]`) — both are genuine two-source compositing operations, not
single-input filters. This is why neither sets `cssFilter`: a CSS filter
string only ever transforms one input image.

## CSS/Canvas2D fallback

`css-filter-chain.ts`'s `composeCssFilterChain` joins an ordered chain's
`cssFilter` fragments (in dependency order — CSS filters already apply
left-to-right) into one string usable via `ctx.filter` or a DOM `style`.
Nodes without a CSS equivalent are reported in `unsupportedIds` rather than
silently dropped, so a caller can decide whether the degraded approximation
is acceptable or whether the `Canvas2D` backend must fall back further
still (`RenderBackend.Software`). See `filters.md`.

## Effect types landed this phase

See `blur.md`, `glow.md`, `shadow.md`, `blend-modes.md`,
`color-adjustments.md`, and `transitions.md` for per-effect detail.
`EffectType`, `BlendMode`, `TransitionType`, and `EffectNodeId` all live in
`@motion-studio/shared` (`packages/shared/src/enums.ts`, `ids.ts`) —
cross-engine enums, mirroring `RenderBackend`/`LayerType`, since Plugin
System's future `EffectsAPI` (Phase 14) and Timeline's `TrackType.Effect`
track type both need to reference them without depending on this package's
internals.

## Open questions

- No backend wiring yet: nothing calls `drawFrame` with a non-identity
  `RenderGraph` built from these nodes. That's Rendering's integration work,
  tracked as an open item in `05-rendering-engine/compositor.md`.
- Texture/render-target management for multi-pass chains (separable blur,
  glow, and drop shadow all need at least one intermediate render target)
  has no concrete design yet — depends on the GPU memory budget number
  still open from Phase 7 (`05-rendering-engine/gpu-memory.md`, CLAUDE.md
  "Known hard risks" #6).
- `EffectsEngine` (`effects-engine.ts`) is a lifecycle facade with no
  runtime state today (every factory is pure) — it exists for consistency
  with every other engine's `initialize/ready/dispose` shape and as the
  extension point Plugin System's `EffectsAPI` will register custom effect
  factories against, the same way `AnimatablePropertyRegistry` (Phase 6)
  predates Plugin's `AICapabilityAPI`.
