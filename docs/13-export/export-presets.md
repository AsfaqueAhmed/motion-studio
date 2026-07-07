# Export Presets

> Status: Phase 10 complete (2026-07-07). `packages/export/src/presets.ts`.

## Shipped presets

| `ExportPreset`          | Resolution | fps | Container | Video codec | Audio codec | Video bitrate | Audio bitrate |
| ----------------------- | ---------- | --- | --------- | ----------- | ----------- | ------------- | ------------- |
| `Preset720p30H264Opus`  | 1280×720   | 30  | MP4       | H.264       | Opus        | 5 Mbps        | 128 kbps      |
| `Preset1080p30H264Opus` | 1920×1080  | 30  | MP4       | H.264       | Opus        | 10 Mbps       | 128 kbps      |
| `Preset4K30H264Opus`    | 3840×2160  | 30  | MP4       | H.264       | Opus        | 35 Mbps       | 192 kbps      |
| `Preset1080p30VP9Opus`  | 1920×1080  | 30  | WebM      | VP9         | Opus        | 8 Mbps        | 128 kbps      |

`Preset1080p30H264Opus` is the MVP preset (`docs/24-roadmap/mvp.md` Step
1). The enum lives in `@motion-studio/shared` (`enums.ts`) because the
event catalog (`AppEventMap.ExportProgressed` et al.) references it; the
concrete spec behind each id (`IExportPreset`) lives in this package —
nothing outside Export needs the codec/bitrate breakdown.

A preset's target resolution/fps is independent of the source
Composition's own dimensions/fps — resampling from source to target fps is
`frame-evaluator.ts`'s `computeExportFrames`, not the preset's concern.

## Why no GIF preset

GIF isn't a WebCodecs or Mediabunny target format at all — it has no video
codec in the H.264/VP9 sense, and would need palette quantization plus a
completely different encoder path (e.g. `gif.js` or a WASM GIF encoder).
Rather than fake an `ExportPreset` enum value with no working
implementation behind it, it's left out entirely. If GIF export becomes a
real requirement, it likely deserves its own output pipeline parallel to
(not a variant of) the MP4/WebM one here.

## Platform presets (YouTube/TikTok/Instagram, vertical/square)

Not implemented. These are just different `width`/`height`/`fps`/bitrate
combinations against the same MP4/H.264+Opus pipeline — adding one is a new
entry in `EXPORT_PRESETS`, not new pipeline code. Deferred until there's a
concrete list of target platforms to encode against.

## Open questions

- Bitrate numbers above are reasonable defaults, not measured against
  real encoder output quality — revisit once real WebCodecs encoding is
  wired up end-to-end.
- No per-preset container capability check yet (e.g. confirming WebM output
  actually works via Mediabunny, per `muxer.md`'s open question on
  `WebMOutputFormat`).
