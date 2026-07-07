import { describe, expect, it, vi } from "vitest";
import type { IPluginAPI } from "../plugin-api";
import { createDefaultExportPresetPlugin } from "./default-export-preset-plugin";

describe("createDefaultExportPresetPlugin", () => {
  it("registers a 1080p30 H.264+Opus preset on activate", async () => {
    const registerPreset = vi.fn();
    const api: IPluginAPI = {
      effects: undefined,
      export: { registerPreset, unregisterPreset: vi.fn() },
      ai: undefined,
      tools: undefined,
      panels: undefined,
    };
    const plugin = createDefaultExportPresetPlugin();

    await plugin.activate(api);

    expect(registerPreset).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "1080p30-h264-opus",
        width: 1920,
        height: 1080,
        fps: 30,
        container: "mp4",
        videoCodec: "avc",
        audioCodec: "opus",
      }),
    );
  });

  it("unregisters the preset on deactivate", async () => {
    const registerPreset = vi.fn();
    const unregisterPreset = vi.fn();
    const api: IPluginAPI = {
      effects: undefined,
      export: { registerPreset, unregisterPreset },
      ai: undefined,
      tools: undefined,
      panels: undefined,
    };
    const plugin = createDefaultExportPresetPlugin();
    await plugin.activate(api);

    await plugin.deactivate();

    expect(unregisterPreset).toHaveBeenCalledWith("1080p30-h264-opus");
  });
});
