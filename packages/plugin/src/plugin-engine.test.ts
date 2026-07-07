import { PluginLifecycleState } from "@motion-studio/shared";
import { describe, expect, it, vi } from "vitest";
import type { IPlugin } from "./plugin";
import type { IPluginAPI } from "./plugin-api";
import { PluginEngine } from "./plugin-engine";

const EMPTY_HOST_API: IPluginAPI = {
  effects: undefined,
  export: undefined,
  ai: undefined,
  tools: undefined,
  panels: undefined,
};

function fakePlugin(id: string, calls: string[] = []): IPlugin {
  return {
    id,
    name: id,
    version: "1.0.0",
    activate: () => {
      calls.push("activate");
    },
    deactivate: () => {
      calls.push("deactivate");
    },
  };
}

describe("PluginEngine", () => {
  it("register/activate/suspend/resume/deactivate drive the underlying registry", async () => {
    const engine = new PluginEngine({ hostApi: EMPTY_HOST_API });
    const calls: string[] = [];
    const plugin = fakePlugin("a", calls);

    engine.register(plugin, { id: "a", name: "a", version: "1.0.0", permissions: [] });
    await engine.activate("a");
    expect(engine.registry.getState("a")).toBe(PluginLifecycleState.Ready);

    engine.suspend("a");
    expect(engine.registry.getState("a")).toBe(PluginLifecycleState.Suspended);

    engine.resume("a");
    expect(engine.registry.getState("a")).toBe(PluginLifecycleState.Ready);

    await engine.deactivate("a");
    expect(calls).toEqual(["activate", "deactivate"]);
    expect(engine.registry.getState("a")).toBe(PluginLifecycleState.Deactivated);
  });

  it("activate() passes the engine's hostApi through to the registry", async () => {
    const registerTool = vi.fn();
    const hostApi: IPluginAPI = {
      ...EMPTY_HOST_API,
      tools: { registerTool, unregisterTool: vi.fn() },
    };
    const engine = new PluginEngine({ hostApi });
    const plugin: IPlugin = {
      id: "a",
      name: "a",
      version: "1.0.0",
      activate: (api) => {
        api.tools?.registerTool({ id: "t", name: "T", icon: "i", category: "c" }, () => ({
          activate: () => {},
          deactivate: () => {},
          cancel: () => {},
        }));
      },
      deactivate: () => {},
    };

    engine.register(plugin, { id: "a", name: "a", version: "1.0.0", permissions: ["tools"] });
    await engine.activate("a");

    expect(registerTool).toHaveBeenCalledTimes(1);
  });

  it("dispose() deactivates every Ready/Suspended plugin", async () => {
    const engine = new PluginEngine({ hostApi: EMPTY_HOST_API });
    const readyCalls: string[] = [];
    const suspendedCalls: string[] = [];
    engine.register(fakePlugin("ready", readyCalls), {
      id: "ready",
      name: "ready",
      version: "1.0.0",
      permissions: [],
    });
    engine.register(fakePlugin("suspended", suspendedCalls), {
      id: "suspended",
      name: "suspended",
      version: "1.0.0",
      permissions: [],
    });
    await engine.activate("ready");
    await engine.activate("suspended");
    engine.suspend("suspended");

    await engine.dispose();

    expect(readyCalls).toEqual(["activate", "deactivate"]);
    expect(suspendedCalls).toEqual(["activate", "deactivate"]);
  });
});
