import type { IPluginToolDefinition, IPluginToolFactory, IToolAPI } from "@motion-studio/plugin";

export interface IRegisteredTool {
  readonly definition: IPluginToolDefinition;
  readonly factory: IPluginToolFactory;
}

/**
 * The Tool Registry `docs/17-ui/toolbar.md` and `packages/plugin/src/tool-api.ts`
 * both describe but neither builds — `IToolAPI` is only an interface until
 * something implements `registerTool`/`unregisterTool` and hands it to
 * `PluginEngine` as `hostApi.tools`. This is that implementation: a plain
 * id → definition/factory map, plus single-active-tool bookkeeping
 * (`toolbar.md`: "Only one primary tool is active at a time"). No pointer
 * routing/Tool Session/Interaction Pipeline yet — those need the Canvas's
 * real hit-testing, which doesn't exist as a package (see toolbar.md's own
 * "Hit testing" section) — so `activate`/`deactivate` here only run each
 * tool's own lifecycle hooks, not a live pointer-event pipeline.
 */
export class ToolRegistry implements IToolAPI {
  private readonly tools = new Map<string, IRegisteredTool>();
  private activeToolId: string | undefined;

  registerTool(definition: IPluginToolDefinition, factory: IPluginToolFactory): void {
    this.tools.set(definition.id, { definition, factory });
  }

  unregisterTool(id: string): void {
    if (this.activeToolId === id) {
      this.activeToolId = undefined;
    }
    this.tools.delete(id);
  }

  list(): IPluginToolDefinition[] {
    return Array.from(this.tools.values()).map((entry) => entry.definition);
  }

  get activeTool(): string | undefined {
    return this.activeToolId;
  }

  /** Deactivates the current tool (if any) and activates `id`, creating a fresh session (`toolbar.md`: "per-activation, not a singleton"). */
  activate(id: string): void {
    const entry = this.tools.get(id);
    if (!entry) {
      throw new Error(`ToolRegistry: unknown tool: "${id}"`);
    }
    this.activeToolId = id;
    entry.factory().activate();
  }
}
