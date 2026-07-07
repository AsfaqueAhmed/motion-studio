import type { EffectType } from "@motion-studio/shared";

/**
 * Structurally mirrors Effects' `IEffectNode` (`packages/effects/src/effect-node.ts`)
 * without importing it — Plugin never imports another engine's concrete
 * classes (CLAUDE.md "the one rule", ARCHITECTURE.md §3, and the precedent
 * every prior phase set: `package.json` dependencies are `@motion-studio/shared`
 * only, see every `packages/*\/package.json`). A plugin author builds one of
 * these the same way Effects itself builds a real `IEffectNode`; the actual
 * `id`/`dependencyIds` wiring into a live `RenderGraph` happens at whatever
 * integration layer eventually holds both a real `EffectsEngine` and a real
 * `PluginRegistry` — not implemented yet, same "engine exists, integration is
 * later" gap Phase 7/8 flagged for Render Graph backend wiring.
 */
export interface IPluginEffectNode {
  readonly id: string;
  readonly type: EffectType;
  readonly dependencyIds: readonly string[];
  readonly wgsl: string;
  readonly glsl: string;
  readonly cssFilter?: string;
}

/** Public surface a plugin sees for the Effects Engine — see docs/16-plugin-system/effects-api.md. */
export interface IEffectsAPI {
  registerEffectNode(node: IPluginEffectNode): void;
  unregisterEffectNode(id: string): void;
}
