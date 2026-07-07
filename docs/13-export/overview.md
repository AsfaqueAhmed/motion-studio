# Export Engine — Overview

Turns a project into an output file. Consumes Frame State (video) and
PCM audio (from the Audio Engine) — never evaluates Timeline logic
itself, never touches project mutation. The encoder knows nothing about
timelines, keyframes, or animation; it only receives frames and audio.

## Pipeline

```
Project → Frame Evaluation → Renderer + Audio Engine
       → Video Encoder + Audio Encoder → Muxer → Output File
```

Preview and export deliberately share the exact same Frame State
evaluation pipeline — this is _why_ what-you-see-in-preview matches
what-you-get-in-export (see `../ARCHITECTURE.md` §4).

## Confirmed, concrete technical gaps (fact-checked during design review)

These are not hypothetical — verify against `webcodecs.md` and
`muxer.md` before trusting any export-related time estimate:

1. **WebCodecs has no built-in container muxer.** A real third-party
   dependency (`mp4-muxer`, WebM Muxer library) is required — budget
   real implementation time for this, not glue code.
2. **AAC encoding is unsupported in Firefox (all platforms) and on
   desktop Linux in any browser.** The "Supported outputs: AAC, Opus,
   PCM" list needs an explicit fallback path (WASM encoder) for AAC on
   those platforms.
3. **No browser supports MP3 encoding via WebCodecs at all.** Needs a
   WASM encoder (e.g. via `ffmpeg.wasm`) if MP3 output is a requirement.
4. **PCM/WAV encoding support via `AudioEncoder` is limited** — likely
   also needs a manual/WASM path.

**Do the export spike in `../24-roadmap/mvp.md` before trusting any
further content in this folder** — it will directly determine which
output formats are realistic for v1 without a WASM fallback.

## Job model

Every export is a job with a state machine: Queued → Preparing →
Rendering → Encoding → Muxing → Finished (or Cancelled/Failed).
Cancellation is safe at any stage (flush encoder, delete temp files,
release resources). Never buffer every frame in memory — encode as
rendered, release, move on.

## Export Graph

Multiple output branches (video, audio, thumbnail, watermark, subtitle
file) can share one render pass rather than re-rendering the timeline
once per output — see `../DECISIONS.md` ADR-005 for how this relates to
the project's other DAG-shaped structures. **Still open** — Phase 10
(below) implements a single video+audio output per job, not the
multi-branch DAG; revisit if/when a second simultaneous output (e.g. a
thumbnail alongside the video) is actually needed.

## Phase 10 implementation (`packages/export`) — complete (2026-07-07)

Built exactly to the "engine exists, integration is a later phase" pattern
Phases 7/8/9 established for their own backends: real orchestration logic,
hand-rolled DI interfaces standing in for the real browser/Mediabunny
surface, no actual `<canvas>`/`VideoEncoder`/Mediabunny wiring yet (that
needs a real Rendering backend and a real Timeline evaluator, neither of
which exists yet either — see those phases' own docs for the same gap).

- `codecs.ts` — `VideoCodec`/`AudioCodec`/`ContainerFormat` enums (local to
  this package, unlike `ExportPreset` which lives in `@motion-studio/shared`
  because the event catalog references it) plus `resolveVideoCodec`/
  `resolveAudioCodec`, which probe capability (H.264→VP9 fallback,
  preferred-audio-codec→Opus fallback) via an injected
  `IEncodeCapabilityProbe` — the real implementation of this interface is a
  thin wrapper around Mediabunny's `canEncodeVideo`/`canEncodeAudio`
  (`muxer.md`).
- `container.ts` — `IMuxerOutput`/`IVideoTrackSource`/`IAudioTrackSource`/
  `IMuxerFactory`, structurally matching Mediabunny's `Output`/
  `CanvasSource`/`AudioBufferSource` (`muxer.md`'s confirmed API shape) so a
  real adapter is a drop-in, the same DI pattern
  `packages/audio/src/audio-context.ts` uses for Web Audio.
- `frame-evaluator.ts` — `computeExportFrames` resamples a Composition's own
  tick-space/fps to a preset's target fps (nearest-source-tick per output
  frame, clamped to the last valid tick) — a real, tested piece of
  frame-rate-conversion logic, independent of any real Timeline/Rendering
  wiring. `IFrameEvaluator`/`IExportFrameRenderer` are the injection points
  a real Timeline evaluation call and a real Rendering backend will satisfy
  later.
- `export-job.ts` — `runExportJob` drives the state machine below,
  emitting `ExportProgressed`/`ExportCompleted`/`ExportFailed` through an
  injected `IExportEventSink` (any object shaped like Core's
  `EventBus.emit` — a real `EventBus` instance satisfies it directly, no
  adapter needed). Cancellation is checked before Preparing commits and
  before every frame; the muxer's `cancel()` (optional in the interface,
  since not every implementation supports aborting mid-write) is called if
  present.
- `export-engine.ts` — `ExportEngine implements IExportEngine`, a thin
  facade (matching `RenderingEngine`'s split) owning one `AbortController`
  per in-flight `jobId` so `cancel(jobId)` works from outside the run loop,
  and rejecting a duplicate `jobId` started while one is still running.
- `wasm-fallback.ts` — registration-only, matching
  `packages/audio/src/effects.ts`'s `createAudioWorkletEffectNode`
  precedent: a provider registry and a `requiresUnavailableFallback` check,
  no actual `ffmpeg.wasm` module ships. See `ffmpeg-wasm.md`.

### Job state machine, as actually implemented

```
Queued (ExportEngine.run) → Preparing (codec resolution + muxer setup)
  → Rendering (per frame: evaluate → render → videoTrack.add — fused,
      because Mediabunny's track add() call *is* the encode step)
  → Encoding (bulk audio, one add() call per job — no chunking yet)
  → Muxing (finalize())
  → Finished
```

`Cancelled` can happen at any of the checked points instead of proceeding;
`Failed` short-circuits from a thrown error at any stage (codec resolution
failure is the only one currently exercised in tests).

### Deviations from the original checklist

- Only one `add()` call for the whole audio buffer, not chunked — fine for
  the durations tested so far, but "never buffer every frame in memory"
  only strictly holds for video today. Revisit for long-form exports once
  a real `IExportAudioSource` (from a real decoded asset) exists.
- GIF is not a preset at all (see `codecs.ts`/`export-presets.md`) — it
  isn't a WebCodecs/Mediabunny target format, so faking an enum value for
  it would have been worse than leaving it out.
