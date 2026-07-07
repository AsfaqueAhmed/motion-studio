# Export Api

> Status: Implemented (Phase 14, `packages/plugin/src/export-api.ts`).

## Shape

```typescript
interface IPluginExportPreset {
  readonly id: string;
  readonly label: string;
  readonly width: number;
  readonly height: number;
  readonly fps: number;
  readonly container: string; // Export's ContainerFormat, as a string
  readonly videoCodec: string; // Export's VideoCodec, as a string
  readonly audioCodec: string; // Export's AudioCodec, as a string
  readonly videoBitrate: number;
  readonly audioBitrate: number;
}

interface IExportAPI {
  registerPreset(preset: IPluginExportPreset): void;
  unregisterPreset(id: string): void;
}
```

Mirrors Export's real `IExportPreset` (`packages/export/src/presets.ts`)
field-for-field, **except** `container`/`videoCodec`/`audioCodec` are
plain strings, not Export's `ContainerFormat`/`VideoCodec`/`AudioCodec`
enums. Those three enums are deliberately package-local to
`@motion-studio/export` (`codecs.ts`: "nothing outside Export needs to
know a preset's codec makeup, only its id") — unlike `ExportPreset` itself,
which lives in `@motion-studio/shared` because the event catalog
references it. Plugin can't import package-local enums from Export
without violating the one-dependency-only rule every package.json in this
repo follows, so this API accepts strings and leaves validating them
against real codec support to whatever integration layer eventually
implements `IExportAPI` against a real `ExportEngine`.

## What's wired up

`createDefaultExportPresetPlugin()` (`built-ins/default-export-preset-plugin.ts`)
is a real, tested built-in plugin that registers a preset shaped exactly
like `EXPORT_PRESETS[ExportPreset.Preset1080p30H264Opus]`
(`"mp4"`/`"avc"`/`"opus"`, 1920×1080@30, matching bitrates) — re-declared
as plain data rather than imported, for the reason above. This proves the
`IExportAPI` shape is usable end-to-end through `PluginRegistry`, but
there is **no real `IExportAPI` implementation** backing it in this
package — the test only asserts the fake `registerPreset`/`unregisterPreset`
mocks were called with the right data, not that a real `ExportEngine`
gained a new preset.

## What's not wired up

- No adapter exists that takes a `IPluginExportPreset` and produces a real
  `IExportPreset` (validating `container`/`videoCodec`/`audioCodec`
  strings against Export's actual enums, rejecting unsupported
  combinations). Building that adapter — and deciding what happens when a
  plugin requests a codec combination the browser's `canEncodeVideo`/
  `canEncodeAudio` doesn't support (`docs/13-export/muxer.md`) — is future
  integration-layer work.
- "Export branches" (the doc's original stub scope: "e.g. watermark,
  subtitle export") aren't modeled at all — `IPluginExportPreset` only
  covers new presets (dimensions/fps/codec/bitrate), not new post-render
  processing steps. Export Graph (multiple output branches sharing one
  render pass) is itself still unimplemented in Export's own package
  (Phase 10's note), so there's nothing for a plugin to hook into yet.

## Open questions

- Preset id collisions: two plugins both registering `"1080p30-h264-opus"`
  — first-wins, last-wins, or reject? Not decided; `IExportAPI` has no
  concrete implementation to enforce a policy yet.
- Should a plugin be able to register a preset using a container/codec
  combination Export doesn't support at all (e.g. `"gif"`, which Phase 10
  explicitly didn't implement)? Left to the future real `IExportAPI`
  implementation to reject.
