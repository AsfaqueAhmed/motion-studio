import type { IPluginAPI } from "./plugin-api";

/** One entry per `IPluginAPI` field — keep these two in sync. */
export const PLUGIN_PERMISSIONS = ["effects", "export", "ai", "tools", "panels"] as const;

export type PluginPermission = (typeof PLUGIN_PERMISSIONS)[number];

export function isKnownPluginPermission(value: string): value is PluginPermission {
  return (PLUGIN_PERMISSIONS as readonly string[]).includes(value);
}

/**
 * Declares a plugin's identity plus the sub-APIs it needs — the
 * "RequestingPermissions" step of `PluginLifecycleState`
 * (`docs/16-plugin-system/lifecycle.md`). `id`/`name`/`version` are
 * declared separately from the `IPlugin` instance so `PluginRegistry.register()`
 * can catch a mismatched manifest (e.g. a manifest built for the wrong
 * plugin) before ever calling into plugin code.
 */
export interface IPluginManifest {
  readonly id: string;
  readonly name: string;
  readonly version: string;
  readonly permissions: readonly PluginPermission[];
}

/**
 * Sandbox enforcement (PLAN.md "Plugin sandbox: plugins only see public
 * APIs, never engine internals"): a plugin receives only the sub-APIs it
 * declared in its manifest. Every other field is `undefined`, so a plugin
 * that never requested `"export"` cannot reach `IExportAPI` even if the
 * host wired one in — this is checked here, not left to plugin authors'
 * self-restraint.
 */
export function buildScopedPluginAPI(
  hostApi: IPluginAPI,
  permissions: readonly PluginPermission[],
): IPluginAPI {
  const granted = new Set<PluginPermission>(permissions);
  return {
    effects: granted.has("effects") ? hostApi.effects : undefined,
    export: granted.has("export") ? hostApi.export : undefined,
    ai: granted.has("ai") ? hostApi.ai : undefined,
    tools: granted.has("tools") ? hostApi.tools : undefined,
    panels: granted.has("panels") ? hostApi.panels : undefined,
  };
}
