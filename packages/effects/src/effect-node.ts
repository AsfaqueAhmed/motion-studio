import type { EffectNodeId, EffectType } from "@motion-studio/shared";

/**
 * One stage in a layer's effect chain, consumed by the Rendering Engine's
 * `RenderGraph` (`packages/rendering/src/render-graph.ts`). Deliberately
 * shaped to structurally satisfy `IRenderGraphNode` (`id` + `dependencyIds`)
 * without importing it — Effects never imports Rendering's concrete classes
 * (CLAUDE.md "Engine ownership"), it only produces data Rendering's own
 * types already accept.
 *
 * `dependencyIds` are the node's inputs (usually one — the previous stage
 * in the chain — except `BlendMode`/`Transition`, which take two: the
 * layer below/before and the layer above/after). `id` doubles as the
 * node's single output identifier, matching every effect chain in
 * `09-effects-engine/*.md` being linear, single-output stages.
 *
 * Every effect authors its shader once per GPU backend (WGSL for WebGPU,
 * GLSL for WebGL2 — ARCHITECTURE.md §6.2, never auto-shared) plus an
 * optional `cssFilter` fragment for the Canvas2D/CSS-filter fallback path
 * (`filters.md`) — not every effect is expressible as a CSS filter (blend
 * modes and transitions need real compositing, not a single-input filter),
 * so `cssFilter` is absent for those.
 */
export interface IEffectNode {
  readonly id: EffectNodeId;
  readonly type: EffectType;
  readonly dependencyIds: readonly EffectNodeId[];
  readonly wgsl: string;
  readonly glsl: string;
  readonly cssFilter?: string;
}
