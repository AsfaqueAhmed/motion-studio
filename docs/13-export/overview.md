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
the project's other DAG-shaped structures.
