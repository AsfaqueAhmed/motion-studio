# Waveform

> Status: Implemented (Phase 9), consumer-side only. `packages/audio/src/waveform.ts`.

Waveform generation delegated to Layer/Media pipeline; Audio Engine only
consumes cached waveform data.

## Scope

`IWaveformData` is the read-side shape: `sampleRate`, `channels`, a
pre-computed `peaks` array (one 0..1 peak value per fixed-size time
bucket), and `durationSeconds`. This package never decodes audio to
produce it — that's the Assets/Media decode pipeline's job
(`14-assets/metadata.md`), same split CLAUDE.md draws between engines
that own decoding internals and engines that only consume the result.

`peaksInRange(waveform, startSeconds, endSeconds)` slices the cached
peaks overlapping a time range, clamped to the array's bounds — this is
what the Timeline UI's clip waveform rendering (Phase 17) will call
against a visible clip's cached peaks, rather than re-slicing the raw
`peaks` array itself at every call site.

## Open questions

- The peak-generation format itself (bucket size / resolution, mono vs.
  per-channel peaks, storage location in the Storage Engine's asset
  cache) is Assets/Storage's decision (Phases 12/14), not Audio's —
  `IWaveformData` here is deliberately generic (`readonly peaks: readonly
number[]`) so it doesn't presuppose that format.
