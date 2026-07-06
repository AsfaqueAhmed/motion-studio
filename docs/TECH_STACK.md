# Tech Stack

Each entry includes fact-checked support status as of mid-2026 where it
was verified during design review, and the caveats that matter for
planning — not just the happy-path capability.

## Frontend

| Tech                         | Notes                                                            |
| ---------------------------- | ---------------------------------------------------------------- |
| Next.js / React / TypeScript | Application shell.                                               |
| TailwindCSS                  | Styling.                                                         |
| Zustand                      | UI-only state (never project data — see `18-state-management/`). |
| dnd-kit                      | Drag and drop.                                                   |

## Rendering

| Tech                   | Notes                                                                                                                                                                                                                 |
| ---------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| WebGPU (primary)       | **Verified solid.** Chrome/Edge since 113 (2023), Safari since 26.0, Firefox 141+ (Windows), 145+ (Apple Silicon macOS). Remaining gaps: Linux across all browsers, and mobile (Firefox Android still behind a flag). |
| WebGL2 (fallback)      | Broad, mature support. **Not shader-compatible with WebGPU** — GLSL vs. WGSL means every effect is authored twice, not automatically shared. See `05-rendering-engine/shader-system.md`.                              |
| Canvas2D (last resort) | Universal support, no GPU acceleration.                                                                                                                                                                               |

## Video / Media

| Tech                              | Notes                                                                                                                                                                                                                                                                                   |
| --------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| WebCodecs                         | Decode/encode primitives. **No built-in container muxing** — a real third-party dependency (`mp4-muxer`, WebM Muxer lib), not glue code. Full support: Chrome/Edge 94+, Firefox 130+ (desktop only — no Firefox Android), Safari 26.0+ (Safari 16.4–18.7 shipped video-only, no audio). |
| Container demuxing                | MP4/MOV need `mp4box.js`/`Mediabunny`/similar; some formats (AVI/MKV) may have no clean native browser path — budget for a WASM fallback.                                                                                                                                               |
| OffscreenCanvas                   | **Verified solid**, ~95% global support including `getContext("webgpu")` in workers. Used for the worker-based rendering architecture.                                                                                                                                                  |
| OPFS (Origin Private File System) | **Verified solid.** Chrome 86+, Edge 86+, Firefox 111+, Safari 15.2+, including mobile. The most reliable API in this stack.                                                                                                                                                            |

## Audio

| Tech                   | Notes                                                                                                                                                                                                                                 |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Web Audio API          | Realtime graph (`AudioContext`) for preview, `OfflineAudioContext` for export — **two different timing models**, custom effect nodes (`AudioWorklet`) must be written to work correctly under both.                                   |
| WebCodecs AudioEncoder | AAC: **not supported in Firefox at all, or on desktop Linux in any browser.** Opus: broadly supported, recommended default. MP3: **no browser supports MP3 encoding via WebCodecs** — needs a WASM encoder if MP3 output is required. |

## AI / Inference

| Tech               | Notes                                                                                                                                                                                                                                      |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| ONNX Runtime Web   | Primary inference runtime, with WebGPU execution provider (fast path) and WASM fallback.                                                                                                                                                   |
| Kokoro-82M / Piper | Treat as independent, interchangeable, complete TTS providers via the Capability Registry — **verify each model's actual published architecture** before assuming a specific pipeline shape between them (see `DECISIONS.md`, open risks). |
| Supertonic         | Optional voice-enhancement post-processing stage.                                                                                                                                                                                          |
| WebNN              | Future — not yet broadly available.                                                                                                                                                                                                        |

## Storage

| Tech      | Notes                                                                                                                       |
| --------- | --------------------------------------------------------------------------------------------------------------------------- |
| IndexedDB | Structured/small data: project JSON, timeline, settings, thumbnails, waveforms.                                             |
| OPFS      | Large binaries: media files, AI models, voice cache, exports. See above — this is the most reliable API in the whole stack. |

## Workers

Dedicated Workers for: rendering, animation evaluation, audio processing,
AI inference, export encoding, thumbnail/waveform/metadata generation,
model loading. All owned by a single Worker Manager (`04-core/worker-manager.md`)
— workers never communicate with each other directly, always through Core.

## Fallback chain summary (for anything GPU/codec-related)

```
WebGPU → WebGL2 → Canvas2D              (rendering)
WebCodecs (native) → WASM (ffmpeg.wasm)  (encode/decode for unsupported codecs/containers)
```

Every feature that depends on a browser API with partial support needs an
explicit, tested fallback path — not just a "this might not work
everywhere" note. See `24-roadmap/mvp.md` for which of these to validate
first via a spike, before building further engine code on top of an
untested assumption.
