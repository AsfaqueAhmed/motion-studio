import type { IEffectsEngine } from "@motion-studio/shared";

/**
 * Lifecycle facade matching every other engine's `initialize/ready/dispose`
 * shape (CLAUDE.md "Engine ownership", `IEngine`). Effects owns no runtime
 * state of its own today — node factories in this package are pure
 * functions — so the facade exists purely for consistency with the rest of
 * the Core Engine set and as the extension point Plugin System's future
 * `EffectsAPI` (Phase 14) will register custom effect node factories
 * against, the same way `AnimatablePropertyRegistry` (Phase 6) predates
 * Plugin's `AICapabilityAPI`.
 */
export class EffectsEngine implements IEffectsEngine {
  readonly name = "Effects";

  initialize(): void {}

  ready(): void {}

  dispose(): void {}
}
