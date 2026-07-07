import { describe, expect, it, vi } from "vitest";
import type { IPluginAPI } from "./plugin-api";
import { buildScopedPluginAPI, isKnownPluginPermission } from "./permissions";

const FULL_HOST_API: IPluginAPI = {
  effects: { registerEffectNode: vi.fn(), unregisterEffectNode: vi.fn() },
  export: { registerPreset: vi.fn(), unregisterPreset: vi.fn() },
  ai: { registerCapability: vi.fn(), registerProvider: vi.fn(), unregisterProvider: vi.fn() },
  tools: { registerTool: vi.fn(), unregisterTool: vi.fn() },
  panels: { registerPanel: vi.fn(), unregisterPanel: vi.fn() },
};

describe("isKnownPluginPermission", () => {
  it("accepts the five declared permissions", () => {
    expect(isKnownPluginPermission("effects")).toBe(true);
    expect(isKnownPluginPermission("export")).toBe(true);
    expect(isKnownPluginPermission("ai")).toBe(true);
    expect(isKnownPluginPermission("tools")).toBe(true);
    expect(isKnownPluginPermission("panels")).toBe(true);
  });

  it("rejects anything else", () => {
    expect(isKnownPluginPermission("filesystem")).toBe(false);
  });
});

describe("buildScopedPluginAPI", () => {
  it("passes through only granted sub-APIs, undefined for the rest", () => {
    const scoped = buildScopedPluginAPI(FULL_HOST_API, ["effects", "panels"]);

    expect(scoped.effects).toBe(FULL_HOST_API.effects);
    expect(scoped.panels).toBe(FULL_HOST_API.panels);
    expect(scoped.export).toBeUndefined();
    expect(scoped.ai).toBeUndefined();
    expect(scoped.tools).toBeUndefined();
  });

  it("returns every field undefined when no permissions are granted", () => {
    const scoped = buildScopedPluginAPI(FULL_HOST_API, []);

    expect(scoped).toEqual({
      effects: undefined,
      export: undefined,
      ai: undefined,
      tools: undefined,
      panels: undefined,
    });
  });

  it("cannot expose a sub-API the host itself never provided, even if granted", () => {
    const partialHostApi: IPluginAPI = { ...FULL_HOST_API, ai: undefined };

    const scoped = buildScopedPluginAPI(partialHostApi, ["ai"]);

    expect(scoped.ai).toBeUndefined();
  });
});
