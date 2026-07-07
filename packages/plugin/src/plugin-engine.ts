import { PluginLifecycleState, type IPluginEngine } from "@motion-studio/shared";
import type { IPlugin } from "./plugin";
import type { IPluginAPI } from "./plugin-api";
import type { IPluginManifest } from "./permissions";
import { PluginRegistry, type IPluginRegistryOptions } from "./plugin-registry";

export interface IPluginEngineOptions extends IPluginRegistryOptions {
  /**
   * The fully-populated `IPluginAPI` this host can offer plugins — assembled
   * by whatever integration layer holds real `EffectsEngine`/`ExportEngine`/
   * `AIManager`/Tool-Registry/Workspace-Engine instances. `PluginEngine`
   * itself never constructs this (it has no dependency on those packages),
   * matching every other engine's DI-only cross-engine boundary.
   */
  readonly hostApi: IPluginAPI;
}

/**
 * Thin `IEngine` facade over `PluginRegistry`, matching `AIManager`/
 * `ExportEngine`/`HistoryEngine`'s split (engine class owns lifecycle,
 * standalone class owns the actual logic). See docs/16-plugin-system/overview.md.
 */
export class PluginEngine implements IPluginEngine {
  readonly name = "Plugin";
  readonly registry: PluginRegistry;

  private readonly hostApi: IPluginAPI;

  constructor(options: IPluginEngineOptions) {
    this.hostApi = options.hostApi;
    this.registry = new PluginRegistry(options);
  }

  initialize(): void {}

  ready(): void {}

  /** Deactivates every `Ready`/`Suspended` plugin before the engine itself is torn down. */
  async dispose(): Promise<void> {
    for (const { id, state } of this.registry.list()) {
      if (state === PluginLifecycleState.Ready || state === PluginLifecycleState.Suspended) {
        await this.registry.deactivate(id);
      }
    }
  }

  register(plugin: IPlugin, manifest: IPluginManifest): void {
    this.registry.register(plugin, manifest);
  }

  activate(pluginId: string): Promise<void> {
    return this.registry.activate(pluginId, this.hostApi);
  }

  suspend(pluginId: string): void {
    this.registry.suspend(pluginId);
  }

  resume(pluginId: string): void {
    this.registry.resume(pluginId);
  }

  deactivate(pluginId: string): Promise<void> {
    return this.registry.deactivate(pluginId);
  }
}
