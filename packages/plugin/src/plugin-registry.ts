import type { AppEventMap, AppEventType } from "@motion-studio/shared";
import { PluginLifecycleState } from "@motion-studio/shared";
import type { IPlugin } from "./plugin";
import type { IPluginAPI } from "./plugin-api";
import { buildScopedPluginAPI, isKnownPluginPermission, type IPluginManifest } from "./permissions";

/** Same generic shape as History's `IHistoryEventSink` / AI's `IAIEventSink`. */
export interface IPluginEventSink {
  emit<T extends AppEventType>(type: T, payload: AppEventMap[T]): void;
}

export class UnknownPluginError extends Error {
  constructor(pluginId: string) {
    super(`PluginRegistry: no plugin registered with id "${pluginId}"`);
    this.name = "UnknownPluginError";
  }
}

export class PluginIdMismatchError extends Error {
  constructor(pluginId: string, manifestId: string) {
    super(`PluginRegistry: plugin id "${pluginId}" does not match manifest id "${manifestId}"`);
    this.name = "PluginIdMismatchError";
  }
}

export class UnknownPluginPermissionError extends Error {
  constructor(pluginId: string, permission: string) {
    super(`PluginRegistry: plugin "${pluginId}" requested unknown permission "${permission}"`);
    this.name = "UnknownPluginPermissionError";
  }
}

export class DuplicatePluginError extends Error {
  constructor(pluginId: string) {
    super(`PluginRegistry: a plugin with id "${pluginId}" is already registered`);
    this.name = "DuplicatePluginError";
  }
}

export class InvalidPluginStateTransitionError extends Error {
  constructor(pluginId: string, from: PluginLifecycleState, action: string) {
    super(`PluginRegistry: cannot ${action} plugin "${pluginId}" while in state "${from}"`);
    this.name = "InvalidPluginStateTransitionError";
  }
}

interface IPluginRecord {
  readonly plugin: IPlugin;
  readonly manifest: IPluginManifest;
  state: PluginLifecycleState;
}

export interface IPluginRegistryOptions {
  readonly events?: IPluginEventSink;
}

/**
 * Registration/activation lifecycle for plugins — PLAN.md Phase 14:
 * "register -> activate -> suspend -> deactivate". See
 * `docs/16-plugin-system/lifecycle.md`.
 *
 * `suspend()`/`resume()` are registry-level bookkeeping only: `IPlugin`
 * declares no `suspend`/`resume` hooks (PLAN.md's `IPlugin` shape is just
 * `activate`/`deactivate`), so suspending a plugin doesn't call into plugin
 * code at all — it just marks the plugin ineligible for whatever dispatches
 * to `Ready` plugins, while keeping its activated instance alive for a
 * cheap `resume()`. This resolves `overview.md`'s open lifecycle question
 * in favor of the simpler option, same call `CompositeCommand` (Phase 11)
 * made for macro-recording granularity.
 */
export class PluginRegistry {
  private readonly plugins = new Map<string, IPluginRecord>();
  private readonly events: IPluginEventSink | undefined;

  constructor(options: IPluginRegistryOptions = {}) {
    this.events = options.events;
  }

  /**
   * `Validating` -> `RequestingPermissions` -> `Registered`. Does not call
   * `plugin.activate()` — that only happens in `activate()`.
   */
  register(plugin: IPlugin, manifest: IPluginManifest): void {
    if (plugin.id !== manifest.id) {
      throw new PluginIdMismatchError(plugin.id, manifest.id);
    }
    if (this.plugins.has(plugin.id)) {
      throw new DuplicatePluginError(plugin.id);
    }
    for (const permission of manifest.permissions) {
      if (!isKnownPluginPermission(permission)) {
        throw new UnknownPluginPermissionError(plugin.id, permission);
      }
    }
    this.plugins.set(plugin.id, {
      plugin,
      manifest,
      state: PluginLifecycleState.Registered,
    });
    this.events?.emit("PluginRegistered", { pluginId: plugin.id });
  }

  /**
   * `Registered` -> `Initializing` -> `Ready`. Builds a permission-scoped
   * `IPluginAPI` from `hostApi` (the real, fully-populated API the caller
   * assembled from its actual engines — this package never assembles that
   * itself, since it never imports another engine) and calls
   * `plugin.activate(scopedApi)`. Reverts to `Registered` on failure so a
   * failed activation can be retried.
   */
  async activate(pluginId: string, hostApi: IPluginAPI): Promise<void> {
    const record = this.requireRecord(pluginId);
    if (record.state !== PluginLifecycleState.Registered) {
      throw new InvalidPluginStateTransitionError(pluginId, record.state, "activate");
    }
    record.state = PluginLifecycleState.Initializing;
    try {
      const scopedApi = buildScopedPluginAPI(hostApi, record.manifest.permissions);
      await record.plugin.activate(scopedApi);
      record.state = PluginLifecycleState.Ready;
      this.events?.emit("PluginActivated", { pluginId });
    } catch (error) {
      record.state = PluginLifecycleState.Registered;
      const reason = error instanceof Error ? error.message : String(error);
      this.events?.emit("PluginActivationFailed", { pluginId, reason });
      throw error;
    }
  }

  /** `Ready` -> `Suspended`. See class doc — no plugin method is called. */
  suspend(pluginId: string): void {
    const record = this.requireRecord(pluginId);
    if (record.state !== PluginLifecycleState.Ready) {
      throw new InvalidPluginStateTransitionError(pluginId, record.state, "suspend");
    }
    record.state = PluginLifecycleState.Suspended;
    this.events?.emit("PluginSuspended", { pluginId });
  }

  /** `Suspended` -> `Ready`. Resumes without re-running `activate()`. */
  resume(pluginId: string): void {
    const record = this.requireRecord(pluginId);
    if (record.state !== PluginLifecycleState.Suspended) {
      throw new InvalidPluginStateTransitionError(pluginId, record.state, "resume");
    }
    record.state = PluginLifecycleState.Ready;
    this.events?.emit("PluginActivated", { pluginId });
  }

  /** `Ready` | `Suspended` -> `Deactivated` (terminal). Calls `plugin.deactivate()`. */
  async deactivate(pluginId: string): Promise<void> {
    const record = this.requireRecord(pluginId);
    if (
      record.state !== PluginLifecycleState.Ready &&
      record.state !== PluginLifecycleState.Suspended
    ) {
      throw new InvalidPluginStateTransitionError(pluginId, record.state, "deactivate");
    }
    await record.plugin.deactivate();
    record.state = PluginLifecycleState.Deactivated;
    this.events?.emit("PluginDeactivated", { pluginId });
  }

  getState(pluginId: string): PluginLifecycleState {
    return this.requireRecord(pluginId).state;
  }

  isRegistered(pluginId: string): boolean {
    return this.plugins.has(pluginId);
  }

  /** Snapshot for a future plugin-management panel — id + state, oldest-registered first. */
  list(): readonly { readonly id: string; readonly state: PluginLifecycleState }[] {
    return [...this.plugins.values()].map((record) => ({
      id: record.plugin.id,
      state: record.state,
    }));
  }

  private requireRecord(pluginId: string): IPluginRecord {
    const record = this.plugins.get(pluginId);
    if (!record) {
      throw new UnknownPluginError(pluginId);
    }
    return record;
  }
}
