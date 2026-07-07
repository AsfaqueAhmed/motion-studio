/**
 * Structurally mirrors Export's `IExportPreset` (`packages/export/src/presets.ts`)
 * — except `container`/`videoCodec`/`audioCodec` are plain strings here, not
 * Export's `ContainerFormat`/`VideoCodec`/`AudioCodec` enums. Those enums are
 * deliberately package-local to `@motion-studio/export` ("nothing outside
 * Export needs to know a preset's codec makeup", `codecs.ts`), so Plugin
 * cannot import them without breaking the one-dependency-only rule every
 * `package.json` in this repo enforces. A plugin-registered preset is data
 * the host validates against its own real codec enums when it wires the
 * preset into a live `ExportEngine` — not implemented yet, see
 * docs/16-plugin-system/export-api.md.
 */
export interface IPluginExportPreset {
  readonly id: string;
  readonly label: string;
  readonly width: number;
  readonly height: number;
  readonly fps: number;
  readonly container: string;
  readonly videoCodec: string;
  readonly audioCodec: string;
  readonly videoBitrate: number;
  readonly audioBitrate: number;
}

/** Public surface a plugin sees for the Export Engine — see docs/16-plugin-system/export-api.md. */
export interface IExportAPI {
  registerPreset(preset: IPluginExportPreset): void;
  unregisterPreset(id: string): void;
}
