# AI Engine (Inference Platform) — Overview

Provides AI capabilities without ever hardcoding which model or runtime
implements them. Features request capabilities ("generate narration
from this text"), never specific models — this is what lets a model be
swapped later without touching editor code.

## Architecture

```
Feature → Capability Registry → Inference Platform → Backend → Model → Result
```

Backends: ONNX Runtime Web on WebGPU (fast path), ONNX Runtime Web on
WASM (fallback), Remote API (optional, future), WebNN (future, not yet
broadly available).

## Capability Registry

Capabilities: TextToSpeech, BackgroundRemoval, UpscaleImage,
SegmentPerson, RemoveNoise, EnhanceVoice, etc. Each declares required
inputs/outputs, compatible models, preferred runtime, and estimated
resource cost. This is the same registry pattern used by the Tool System
(`../17-ui/toolbar.md`) — intentional reuse, not a naming collision (see
`../GLOSSARY.md`).

## TTS pipeline — confirmed by Spike B

Earlier drafts assumed a specific sequential pipeline (`Kokoro-82M →
phonemes → "Piper Vocoder" → audio`). **Spike B confirmed this misrepresents
how these models actually work.** Kokoro-82M is a single end-to-end ONNX
graph (one `.onnx` file, one inference call); phonemization happens in pure
JS ahead of the ONNX call, not as a separate neural stage. Kokoro-82M and
Piper are independent, complete TTS systems in their own right, not
sequential stages of one pipeline — treat both as interchangeable, complete
providers behind the `TextToSpeech` capability. Full findings:
`kokoro.md`, `piper.md`.

## Models

Never bundled with the app. Downloaded on demand, checksum-verified,
stored via the VFS in OPFS, LRU-evicted from an in-memory cache. Model
metadata (id, version, task, size, backend, license) lives in a Model
Registry.

Real measured sizes (Kokoro-82M, Spike B): `q8` quantized ≈ 92 MB, `fp32` ≈
326 MB, plus a ~4 MB ONNX Runtime Web WASM binary and ~0.5 MB per voice.
Default to `q8` — see `kokoro.md` for why.

## Performance goals — real numbers from Spike B (2026-07-06)

Measured with `kokoro-js` (ONNX Runtime Web), Kokoro-82M, a 10-second test
sentence, on the dev machine via headless Chromium (see `kokoro.md` for full
methodology and caveats):

| Goal (as originally stated)     | Measured                                                                                                                                                                                                                                      |
| ------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Model load <2s (cached)         | **0.5s** (WASM, warm) — met                                                                                                                                                                                                                   |
| TTS: near real-time             | **14.1s to generate 10s of audio** (WASM, warm) — **not met**, ~1.4x real-time. WebGPU measured far worse (199s) but that number is suspected to be an artifact of the headless test environment, not a real signal — see `kokoro.md` caveat. |
| Cold load (uncached, first run) | not previously stated — now recorded: **84s** (WASM, `q8`, ~97 MB download)                                                                                                                                                                   |

**The `<5s` warm-generate pass criterion from `PLAN.md` was not met.** This
is an open gap, not a rounding error — see `kokoro.md`'s Open questions for
the options being weighed (streaming output, lower quantization, or a UX
that doesn't assume near-instant generation).

## Security

Model checksum verification before use, sandboxed inference workers,
input validation, no unrestricted remote model execution.
