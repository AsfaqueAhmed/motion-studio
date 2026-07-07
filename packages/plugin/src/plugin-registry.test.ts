import { PluginLifecycleState } from "@motion-studio/shared";
import { describe, expect, it, vi } from "vitest";
import type { IPluginAPI } from "./plugin-api";
import type { PluginPermission } from "./permissions";
import type { IPlugin } from "./plugin";
import {
  DuplicatePluginError,
  InvalidPluginStateTransitionError,
  PluginIdMismatchError,
  PluginRegistry,
  UnknownPluginError,
  UnknownPluginPermissionError,
} from "./plugin-registry";

const EMPTY_HOST_API: IPluginAPI = {
  effects: undefined,
  export: undefined,
  ai: undefined,
  tools: undefined,
  panels: undefined,
};

function fakePlugin(id: string, calls: string[] = []): { plugin: IPlugin; calls: string[] } {
  const plugin: IPlugin = {
    id,
    name: `Plugin ${id}`,
    version: "1.0.0",
    activate: () => {
      calls.push("activate");
    },
    deactivate: () => {
      calls.push("deactivate");
    },
  };
  return { plugin, calls };
}

function manifest(id: string, permissions: readonly PluginPermission[] = []) {
  return { id, name: `Plugin ${id}`, version: "1.0.0", permissions };
}

describe("PluginRegistry", () => {
  it("register() moves a plugin to Registered without activating it", () => {
    const registry = new PluginRegistry();
    const { plugin, calls } = fakePlugin("a");

    registry.register(plugin, manifest("a"));

    expect(registry.getState("a")).toBe(PluginLifecycleState.Registered);
    expect(calls).toEqual([]);
  });

  it("register() throws PluginIdMismatchError when plugin.id !== manifest.id", () => {
    const registry = new PluginRegistry();
    const { plugin } = fakePlugin("a");

    expect(() => registry.register(plugin, manifest("b"))).toThrow(PluginIdMismatchError);
  });

  it("register() throws DuplicatePluginError on a second registration of the same id", () => {
    const registry = new PluginRegistry();
    const { plugin } = fakePlugin("a");

    registry.register(plugin, manifest("a"));

    expect(() => registry.register(plugin, manifest("a"))).toThrow(DuplicatePluginError);
  });

  it("register() throws UnknownPluginPermissionError for an unrecognized permission", () => {
    const registry = new PluginRegistry();
    const { plugin } = fakePlugin("a");

    expect(() =>
      registry.register(plugin, manifest("a", ["not-a-real-permission" as PluginPermission])),
    ).toThrow(UnknownPluginPermissionError);
  });

  it("activate() runs plugin.activate() and moves to Ready", async () => {
    const registry = new PluginRegistry();
    const { plugin, calls } = fakePlugin("a");
    registry.register(plugin, manifest("a"));

    await registry.activate("a", EMPTY_HOST_API);

    expect(calls).toEqual(["activate"]);
    expect(registry.getState("a")).toBe(PluginLifecycleState.Ready);
  });

  it("activate() only passes through sub-APIs the manifest granted", async () => {
    const registry = new PluginRegistry();
    let received: IPluginAPI | undefined;
    const plugin: IPlugin = {
      id: "a",
      name: "A",
      version: "1.0.0",
      activate: (api) => {
        received = api;
      },
      deactivate: () => {},
    };
    registry.register(plugin, manifest("a", ["tools"]));

    const hostApi: IPluginAPI = {
      ...EMPTY_HOST_API,
      tools: { registerTool: vi.fn(), unregisterTool: vi.fn() },
      export: { registerPreset: vi.fn(), unregisterPreset: vi.fn() },
    };
    await registry.activate("a", hostApi);

    expect(received?.tools).toBe(hostApi.tools);
    expect(received?.export).toBeUndefined();
  });

  it("activate() reverts to Registered and rethrows when plugin.activate() throws", async () => {
    const registry = new PluginRegistry();
    const plugin: IPlugin = {
      id: "a",
      name: "A",
      version: "1.0.0",
      activate: () => {
        throw new Error("boom");
      },
      deactivate: () => {},
    };
    registry.register(plugin, manifest("a"));

    await expect(registry.activate("a", EMPTY_HOST_API)).rejects.toThrow("boom");
    expect(registry.getState("a")).toBe(PluginLifecycleState.Registered);
  });

  it("activate() throws InvalidPluginStateTransitionError when not Registered", async () => {
    const registry = new PluginRegistry();
    const { plugin } = fakePlugin("a");
    registry.register(plugin, manifest("a"));
    await registry.activate("a", EMPTY_HOST_API);

    await expect(registry.activate("a", EMPTY_HOST_API)).rejects.toThrow(
      InvalidPluginStateTransitionError,
    );
  });

  it("suspend() then resume() round-trips without calling plugin methods", async () => {
    const registry = new PluginRegistry();
    const { plugin, calls } = fakePlugin("a");
    registry.register(plugin, manifest("a"));
    await registry.activate("a", EMPTY_HOST_API);

    registry.suspend("a");
    expect(registry.getState("a")).toBe(PluginLifecycleState.Suspended);

    registry.resume("a");
    expect(registry.getState("a")).toBe(PluginLifecycleState.Ready);
    expect(calls).toEqual(["activate"]);
  });

  it("suspend() throws when the plugin isn't Ready", () => {
    const registry = new PluginRegistry();
    const { plugin } = fakePlugin("a");
    registry.register(plugin, manifest("a"));

    expect(() => registry.suspend("a")).toThrow(InvalidPluginStateTransitionError);
  });

  it("deactivate() calls plugin.deactivate() and is terminal", async () => {
    const registry = new PluginRegistry();
    const { plugin, calls } = fakePlugin("a");
    registry.register(plugin, manifest("a"));
    await registry.activate("a", EMPTY_HOST_API);

    await registry.deactivate("a");

    expect(calls).toEqual(["activate", "deactivate"]);
    expect(registry.getState("a")).toBe(PluginLifecycleState.Deactivated);
    await expect(registry.deactivate("a")).rejects.toThrow(InvalidPluginStateTransitionError);
  });

  it("deactivate() works from Suspended too", async () => {
    const registry = new PluginRegistry();
    const { plugin, calls } = fakePlugin("a");
    registry.register(plugin, manifest("a"));
    await registry.activate("a", EMPTY_HOST_API);
    registry.suspend("a");

    await registry.deactivate("a");

    expect(calls).toEqual(["activate", "deactivate"]);
    expect(registry.getState("a")).toBe(PluginLifecycleState.Deactivated);
  });

  it("getState() throws UnknownPluginError for an id that was never registered", () => {
    const registry = new PluginRegistry();
    expect(() => registry.getState("missing")).toThrow(UnknownPluginError);
  });

  it("emits PluginRegistered/PluginActivated/PluginSuspended/PluginDeactivated through the injected sink", async () => {
    const emit = vi.fn();
    const registry = new PluginRegistry({ events: { emit } });
    const { plugin } = fakePlugin("a");

    registry.register(plugin, manifest("a"));
    await registry.activate("a", EMPTY_HOST_API);
    registry.suspend("a");
    registry.resume("a");
    await registry.deactivate("a");

    expect(emit).toHaveBeenNthCalledWith(1, "PluginRegistered", { pluginId: "a" });
    expect(emit).toHaveBeenNthCalledWith(2, "PluginActivated", { pluginId: "a" });
    expect(emit).toHaveBeenNthCalledWith(3, "PluginSuspended", { pluginId: "a" });
    expect(emit).toHaveBeenNthCalledWith(4, "PluginActivated", { pluginId: "a" });
    expect(emit).toHaveBeenNthCalledWith(5, "PluginDeactivated", { pluginId: "a" });
  });

  it("emits PluginActivationFailed when activation throws", async () => {
    const emit = vi.fn();
    const registry = new PluginRegistry({ events: { emit } });
    const plugin: IPlugin = {
      id: "a",
      name: "A",
      version: "1.0.0",
      activate: () => {
        throw new Error("boom");
      },
      deactivate: () => {},
    };
    registry.register(plugin, manifest("a"));

    await expect(registry.activate("a", EMPTY_HOST_API)).rejects.toThrow();

    expect(emit).toHaveBeenCalledWith("PluginActivationFailed", {
      pluginId: "a",
      reason: "boom",
    });
  });

  it("list() reports id + state for every registered plugin", async () => {
    const registry = new PluginRegistry();
    const { plugin: a } = fakePlugin("a");
    const { plugin: b } = fakePlugin("b");
    registry.register(a, manifest("a"));
    registry.register(b, manifest("b"));
    await registry.activate("a", EMPTY_HOST_API);

    expect(registry.list()).toEqual([
      { id: "a", state: PluginLifecycleState.Ready },
      { id: "b", state: PluginLifecycleState.Registered },
    ]);
  });
});
