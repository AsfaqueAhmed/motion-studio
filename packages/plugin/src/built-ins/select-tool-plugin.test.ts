import { describe, expect, it, vi } from "vitest";
import type { IPluginAPI } from "../plugin-api";
import { createSelectToolPlugin } from "./select-tool-plugin";

describe("createSelectToolPlugin", () => {
  it("registers a Select tool definition on activate", async () => {
    const registerTool = vi.fn();
    const unregisterTool = vi.fn();
    const api: IPluginAPI = {
      effects: undefined,
      export: undefined,
      ai: undefined,
      tools: { registerTool, unregisterTool },
      panels: undefined,
    };
    const plugin = createSelectToolPlugin();

    await plugin.activate(api);

    expect(registerTool).toHaveBeenCalledTimes(1);
    const [definition] = registerTool.mock.calls[0] as [{ id: string; shortcut?: string }];
    expect(definition.id).toBe("select");
    expect(definition.shortcut).toBe("V");
  });

  it("unregisters the tool on deactivate", async () => {
    const registerTool = vi.fn();
    const unregisterTool = vi.fn();
    const api: IPluginAPI = {
      effects: undefined,
      export: undefined,
      ai: undefined,
      tools: { registerTool, unregisterTool },
      panels: undefined,
    };
    const plugin = createSelectToolPlugin();
    await plugin.activate(api);

    await plugin.deactivate();

    expect(unregisterTool).toHaveBeenCalledWith("select");
  });

  it("does nothing if activated without tools permission", async () => {
    const api: IPluginAPI = {
      effects: undefined,
      export: undefined,
      ai: undefined,
      tools: undefined,
      panels: undefined,
    };
    const plugin = createSelectToolPlugin();

    expect(() => plugin.activate(api)).not.toThrow();
    expect(() => plugin.deactivate()).not.toThrow();
  });
});
