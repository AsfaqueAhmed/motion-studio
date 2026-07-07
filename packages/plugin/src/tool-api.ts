/**
 * Matches `ToolDefinition` from `docs/17-ui/toolbar.md` ("Tools register at
 * startup or via plugins"): id, name, icon, category, shortcut, cursor,
 * factory. The Tool Registry/Tool Manager that would consume this doesn't
 * exist yet (Phase 15/17-ui, `apps/studio`) — this is the registration
 * shape a future Tool Registry will accept, not a wired-up integration.
 */
export interface IPluginToolDefinition {
  readonly id: string;
  readonly name: string;
  readonly icon: string;
  readonly category: string;
  readonly shortcut?: string;
  readonly cursor?: string;
}

/**
 * Minimal subset of `toolbar.md`'s `Tool` interface. Pointer/keyboard/wheel
 * handlers and `renderOverlay()` are deliberately omitted here — those are
 * shaped by the Interaction Pipeline (`InteractionContext`: pointer, camera,
 * viewport, selection, snapping, guides, modifiers) which doesn't exist yet
 * either. Wiring a plugin's tool session into that pipeline is Phase 15/17
 * work; this interface only covers the part Phase 14 can implement now
 * (activate/deactivate/cancel), matching `IPlugin`'s own activate/deactivate
 * shape rather than guessing at an unbuilt pointer-event contract.
 */
export interface IPluginTool {
  activate(): void;
  deactivate(): void;
  cancel(): void;
}

export type IPluginToolFactory = () => IPluginTool;

/** Public surface a plugin sees for the (not-yet-built) Tool Registry — see docs/16-plugin-system/overview.md. */
export interface IToolAPI {
  registerTool(definition: IPluginToolDefinition, factory: IPluginToolFactory): void;
  unregisterTool(id: string): void;
}
