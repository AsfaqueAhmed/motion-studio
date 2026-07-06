# Kokoro

> Status: Spike B complete (2026-07-06). Findings below replace speculation.

## Spike B results — Kokoro-82M via `kokoro-js` (ONNX Runtime Web)

Test harness: `spikes/spike-b-tts/` (Vite + TypeScript, throwaway). Model:
`onnx-community/Kokoro-82M-v1.0-ONNX`, driven headlessly via Playwright with
a persistent profile (to distinguish true cold vs. warm loads across
navigations). Test sentence: ~28 words, producing ~10s of audio. Voice:
`af_heart`. Raw driver: `spikes/spike-b-tts/run-spike.mjs`.

| Metric                       | WASM EP, `q8`                         | WebGPU EP, `fp32`                                                  |
| ---------------------------- | ------------------------------------- | ------------------------------------------------------------------ |
| Model file downloaded        | `model_quantized.onnx` — **92.36 MB** | `model.onnx` — **325.53 MB**                                       |
| Voice file (`af_heart.bin`)  | 0.51 MB                               | 0.51 MB                                                            |
| ORT WebAssembly runtime      | 4.11 MB                               | 4.11 MB                                                            |
| **Total cold download**      | **~97.0 MB**                          | **~330.2 MB**                                                      |
| Cold load time               | 84.3s                                 | 282.0s (4.7 min)                                                   |
| Warm load time (cached)      | 0.50s                                 | 0.65s                                                              |
| Generate 10s sentence (cold) | 15.2s                                 | not captured — cold run's 300s budget was consumed by the download |
| Generate 10s sentence (warm) | 14.1s                                 | **199.0s**                                                         |

`dtype` differs between the two rows because `kokoro-js`'s own README
recommends `fp32` when `device: "webgpu"` — so this isn't an apples-to-apples
quantization comparison, it's each execution provider run the way the library
authors recommend it be run.

## Confirmed findings

- **Pipeline shape resolved:** Kokoro-82M is a **single end-to-end ONNX
  graph** (one `.onnx` file loaded once), not a multi-stage pipeline.
  Phonemization happens in pure JS (the `phonemizer` npm package, a
  dependency of `kokoro-js`), not as a separate neural stage. This confirms
  the assumption already recorded in `CLAUDE.md`'s known risks and
  `overview.md`: Kokoro is one complete, independent `TextToSpeech` provider,
  not a sequential stage feeding into something else.
- **`q8` quantization is the right default.** 92 MB vs. 326 MB for `fp32` is
  a 3.5x difference in download size, and cold load time scales with it
  (84s vs. 282s in this test). There is no reason to ship `fp32` by default.
- **Neither path meets the `<5s` warm-generate pass criterion from
  `PLAN.md`.** WASM warm-generate was 14.1s for a 10s sentence (i.e., not
  real-time — roughly 1.4x the audio's own duration). This is a real gap,
  not a rounding error, and needs a decision (see Open questions).
- **The WebGPU number (199s to generate) is almost certainly not
  representative of real end-user hardware** — see caveat below. It should
  not be used to rule out WebGPU as a backend.

## Caveat: WebGPU result is unreliable in this test environment

The 199s warm-generate time under `device: "webgpu"` is **13x slower** than
the WASM path on the same machine — the opposite of what WebGPU should give
for a compute-bound inference workload. Attempts to confirm whether the
adapter was a real GPU or a software fallback were inconclusive:
`GPUAdapter.info` returned an empty object (Chrome redacts vendor/
architecture details by default) and `chrome://gpu` is blocked from
automated navigation in Playwright's bundled Chromium. Headless/automated
browser sessions are known to sometimes fall back to software GPU emulation
(e.g. SwiftShader/Dawn-on-CPU) even when `navigator.gpu` reports available.

**Do not treat the WebGPU numbers here as a verdict on WebGPU's viability.**
Before making a backend decision, re-run `spikes/spike-b-tts/` in a real,
non-automated Chrome window on representative end-user hardware
(a mid-range laptop GPU, not the dev machine) and compare again.

## Open questions

- **The 14.1s WASM generate time for a 10s sentence misses the `<5s` MVP
  target.** Options worth evaluating before Phase 1 commits to a UX around
  this: (a) use `kokoro-js`'s streaming API (`tts.stream()`) so the UI shows
  first audio much sooner than total compute time, even if total compute is
  unchanged; (b) try a smaller quantization (`q4`/`q4f16`) and listen for
  quality loss; (c) accept non-real-time generation and design the narration
  UX around a progress indicator rather than instant playback. Not evaluated
  in this spike — flagging for a follow-up decision.
- Re-validate WebGPU timing on real hardware (see caveat above) before
  deciding WASM-only vs. WebGPU-with-WASM-fallback for the AI Engine's
  backend selection logic.
- Multi-voice, multi-language, and long-form (>10s) generation are untested.
- Model checksum verification (`overview.md`'s stated requirement) was not
  exercised here — `kokoro-js`/`transformers.js` handle download + browser
  cache internally; confirm whether they expose a hash to verify against, or
  whether Motion Studio needs to fetch-and-verify itself before handing bytes
  to ONNX Runtime.
