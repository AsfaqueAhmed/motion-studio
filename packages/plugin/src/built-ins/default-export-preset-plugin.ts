import type { IPlugin } from "../plugin";
import type { IPluginAPI } from "../plugin-api";
import type { PluginPermission } from "../permissions";

const PLUGIN_ID = "builtin.export-presets";

/**
 * "Built-in export presets ... as first-class plugins" (PLAN.md Phase 14).
 * The values here deliberately match `EXPORT_PRESETS[ExportPreset.Preset1080p30H264Opus]`
 * (`packages/export/src/presets.ts`) field-for-field — re-declared as plain
 * data rather than imported, since `IPluginExportPreset` uses strings for
 * codec/container (see `export-api.ts`) and Plugin can't import Export's
 * package-local `VideoCodec`/`AudioCodec`/`ContainerFormat` enums anyway.
 * A real integration layer would need to keep these two in sync (or, more
 * likely, replace this plugin with one that reads the real presets and
 * re-exposes them) — that reconciliation is not implemented, same
 * "engine exists, integration is later" gap as Effects' render-graph
 * wiring.
 */
export function createDefaultExportPresetPlugin(): IPlugin {
  let exportApi: IPluginAPI["export"];

  return {
    id: PLUGIN_ID,
    name: "Default Export Presets",
    version: "0.1.0",
    activate(api: IPluginAPI): void {
      exportApi = api.export;
      exportApi?.registerPreset({
        id: "1080p30-h264-opus",
        label: "1080p30 (H.264 + Opus)",
        width: 1920,
        height: 1080,
        fps: 30,
        container: "mp4",
        videoCodec: "avc",
        audioCodec: "opus",
        videoBitrate: 10_000_000,
        audioBitrate: 128_000,
      });
    },
    deactivate(): void {
      exportApi?.unregisterPreset("1080p30-h264-opus");
      exportApi = undefined;
    },
  };
}

export const DEFAULT_EXPORT_PRESET_PLUGIN_MANIFEST = {
  id: PLUGIN_ID,
  name: "Default Export Presets",
  version: "0.1.0",
  permissions: ["export"] as readonly PluginPermission[],
};
