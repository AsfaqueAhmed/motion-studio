---
name: project-phase8-effects-engine
description: "Phase 8 Effects Engine decisions — IEffectNode shape, chain factories for Blur/Glow/Shadow/BlendMode/ColorAdjustment/Transition, CSS fallback, what's still open before backend wiring"
metadata: 
  node_type: memory
  type: project
  originSessionId: 64d1d570-786a-4e5f-962d-922cd2a78b88
---

Phase 8 (Effects Engine, `packages/effects`) complete as of 2026-07-07, on
branch `phase-8-effects-engine` (branched from `phase-7-rendering-engine`,
following [[feedback_phase_branching]]).

**`IEffectNode`** (`effect-node.ts`) is `{ id, type, dependencyIds, wgsl, glsl, cssFilter? }`
— deliberately shaped to structurally satisfy Rendering's `IRenderGraphNode`
(`id` + `dependencyIds`) without importing it, preserving the "engines never
import each other's concrete classes" rule. `EffectType`, `BlendMode`,
`TransitionType`, `EffectNodeId` were added to `@motion-studio/shared`
(enums.ts/ids.ts), same cross-engine-enum pattern as `RenderBackend`.

**Multi-stage effects return `IEffectNode[]`, not a single node**: Glow and
Drop Shadow are each 4-node chains (bright-pass/silhouette → blur:h →
blur:v → composite), reusing `createGaussianBlurPair` from `blur.ts` rather
than reimplementing blur. `effect-chain.ts`'s `orderEffectChain` re-derives
dependency order using the shared `Dag` primitive (ADR-005 #3) — a second
independent instantiation of `Dag`, not a new graph type.

**Params are baked into shader source as consts**, not left as runtime
uniforms — there's no backend wiring yet to feed these nodes real uniform
buffers (Rendering's `RenderGraph` still isn't wired into any backend's
`drawFrame`, an open item carried over from [[project_phase7_rendering_engine]]).
This is a real open decision for whoever does that wiring: keep baking
(recompile per param change) vs. add an explicit uniform-buffer layout to
`IEffectNode`.

**Two-input nodes**: only `BlendMode` (`[bottomId, topId]`) and
`Transition` (`[fromId, toId]`) take two dependencies — genuine
compositing ops, not single-input filters. Neither sets `cssFilter` for
that reason. `BlendMode` instead exposes `canvasCompositeOperation(mode)`
mapping to native Canvas2D `globalCompositeOperation` strings (lossless
fallback). Blend mode formulas are the one place WGSL/GLSL source is
actually shared (one formula table, reused for both) since both languages
accept identical vec3 expression syntax there — everywhere else in the
rendering/effects code, WGSL and GLSL are authored twice per ADR-004.

**Transition ownership boundary**: Effects only knows *how* to blend two
frames given a `progress` value (0..1); Timeline (not yet wired) will own
*when* a transition is active (TrackItem overlap region) and compute
`progress` per tick. Effects never reads Timeline state directly.

**CSS/Canvas2D fallback**: `css-filter-chain.ts`'s `composeCssFilterChain`
joins an ordered chain's `cssFilter` fragments and reports nodes with no
CSS equivalent in `unsupportedIds` rather than silently degrading —
Blur, DropShadow, and ColorAdjustment (when temperature/tint are both 0)
have exact/lossless CSS fallbacks; Glow and Transition have none as a
single node (documented workarounds in their docs instead).

**Still open** (see `docs/09-effects-engine/overview.md` "Open questions"):
no backend wiring (nothing calls `drawFrame` with a non-identity
`RenderGraph` built from these nodes), and no render-target/multi-pass
execution plumbing for the separable-blur-based chains — both blocked on
the same GPU memory budget number [[project_phase7_rendering_engine]]
flagged as still open.

All effect factories are pure functions — `EffectsEngine`
(`effects-engine.ts`) is a no-op lifecycle facade added purely for
consistency with every other engine's `initialize/ready/dispose` shape,
same bonus pattern Phase 7 used for `RenderingEngine`.
