/**
 * Matches `panels.md`'s "every visible panel is a plugin-like module
 * registered with the Workspace Engine." The Workspace Engine and its
 * Split/Stack/Panel docking tree (`docs/17-ui/docking.md`) don't exist yet
 * (Phase 15/17-ui) — this is the registration shape a future Workspace
 * Engine will accept.
 */
export interface IPluginPanelDefinition {
  readonly id: string;
  readonly title: string;
  readonly icon?: string;
}

/**
 * `mount`/`unmount` take an `HTMLElement` rather than a framework-specific
 * type (e.g. a React component) — `apps/studio` is Next.js/React
 * (CLAUDE.md tech stack), but Plugin itself has no UI framework dependency,
 * matching every other package's "pure TypeScript, `@motion-studio/shared`
 * only" dependency list.
 */
export interface IPluginPanel {
  mount(container: HTMLElement): void;
  unmount(): void;
}

export type IPluginPanelFactory = () => IPluginPanel;

/** Public surface a plugin sees for the (not-yet-built) Workspace Engine — see docs/16-plugin-system/overview.md. */
export interface IPanelAPI {
  registerPanel(definition: IPluginPanelDefinition, factory: IPluginPanelFactory): void;
  unregisterPanel(id: string): void;
}
