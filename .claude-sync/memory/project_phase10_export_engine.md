---
name: project-phase10-export-engine
description: "Phase 10 Export Engine decisions — Mediabunny-shaped DI (no real dep yet), codec/preset design, job state machine, GIF/WASM left open"
metadata: 
  node_type: memory
  type: project
  originSessionId: 48b91b31-3e34-4e3c-a487-e58ddadbe674
---

Phase 10 (`packages/export`) complete 2026-07-07, same session as Phase 9
commit. Branch `phase-10-export-engine` off `phase-9-audio-engine`.

**Why:** Followed [[feedback_phase_branching]] — committed Phase 9's
uncommitted audio-engine work first (51 tests passing, full repo typecheck
clean), then branched for Phase 10.

Key decisions:
- **No real `mediabunny` dependency added.** Hand-rolled DI interfaces
  (`container.ts`: `IMuxerOutput`/`IVideoTrackSource`/`IAudioTrackSource`/
  `IMuxerFactory`) structurally match Mediabunny's real API (confirmed
  shape in `docs/13-export/muxer.md` from Spike A) — same "engine exists,
  integration is a later phase" pattern as Phases 7/8/9's own backends.
  `VideoCodec`/`AudioCodec`/`ContainerFormat` enums are local to
  `packages/export`, not `@motion-studio/shared` (unlike `ExportPreset`,
  which shared needs because the event catalog references it).
- **No separate `IVideoEncoder`/`IAudioEncoder` wrapper** — Mediabunny's
  track `add()` call fuses render-capture + encode in one step, so
  wrapping raw WebCodecs directly would duplicate what Mediabunny already
  does. Documented in `docs/13-export/encoder.md`.
- Extended `ExportPreset` enum in `@motion-studio/shared/enums.ts`: added
  `Preset720p30H264Opus`, `Preset4K30H264Opus`, `Preset1080p30VP9Opus`
  alongside the existing MVP `Preset1080p30H264Opus`. **GIF intentionally
  has no enum value** — not a WebCodecs/Mediabunny target format at all
  (needs palette quantization, a completely different pipeline).
- `computeExportFrames` (`frame-evaluator.ts`) does real fps-resampling
  (source composition tick-space → preset target fps, nearest-tick,
  clamped to last valid tick) — genuinely tested logic, not a stub.
- Job state machine (`export-job.ts`'s `runExportJob`): Queued → Preparing
  → Rendering (per-frame evaluate+render+encode fused) → Encoding (bulk
  audio, one `add()` call, not chunked) → Muxing → Finished, with
  Cancelled/Failed as alternate terminal states. Progress via
  `ExportProgressed`/`ExportCompleted`/`ExportFailed` (already existed in
  the shared event catalog since Phase 1 scaffolding) through an injected
  `IExportEventSink` — same generic shape as Core's `EventBus.emit`, so a
  real `EventBus` satisfies it with no adapter, avoiding a hard dependency
  on `@motion-studio/core` (no package depends on Core directly; it's only
  wired at the app composition root).
- `ExportEngine` (thin `IEngine` facade, mirrors `RenderingEngine`'s split)
  owns one `AbortController` per `jobId`, rejects duplicate concurrent
  `jobId`s, aborts all jobs on `dispose()`.
- WASM fallback (`wasm-fallback.ts`) is registration-only, matching
  [[project_phase9_audio_engine]]'s AudioWorklet precedent — no real
  `ffmpeg.wasm` module, and `export-job.ts` doesn't call into it on codec
  failure yet (that wiring is the next real step once a provider exists).
- Export Graph (ADR-005's DAG primitive backing multi-branch output) is
  **not implemented** — one video+audio output per job only. Flagged as
  open in `docs/13-export/overview.md`.

**How to apply:** When Rendering/Timeline integration eventually lands,
the seams to fill are `IFrameEvaluator.evaluate` (real Timeline+Animation
eval) and `IExportFrameRenderer.renderFrame` (real Rendering backend
drawing to the same canvas the video track source was built against). When
adding a real Mediabunny dependency, it should satisfy `container.ts`'s
interfaces directly — no new abstraction needed.
