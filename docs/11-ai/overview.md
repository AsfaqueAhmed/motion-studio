# AI Engine (Inference Platform) — Overview

> Status: Implemented (Phase 13, 2026-07-07). See `packages/ai/src/`.

Provides AI capabilities without ever hardcoding which model or runtime
implements them. Features request capabilities ("generate narration
from this text"), never specific models — this is what lets a model be
swapped later without touching editor code.

## Architecture

```
Feature → Capability Registry → Inference Platform → Backend → Model → Result
```

Implemented as: `AIManager` (`ai-manager.ts`, the `IEngine` facade) →
`CapabilityRegistry` (`capability-registry.ts`) → `ModelManager` +
`IOnnxRuntime`/`IInferenceSession` (`model-manager.ts`,
`inference-backend.ts`) → `IModelDescriptor` → `ISynthesizedAudio` /
future capability-specific result types.

Backends: ONNX Runtime Web on WebGPU (fast path), ONNX Runtime Web on
WASM (fallback) — `InferenceBackend` + `resolveInferenceBackend()`
(`inference-backend.ts`). Remote API and WebNN backends are still future
work, same as originally stated; only the two ONNX Runtime Web execution
providers are wired into `resolveInferenceBackend`.

## Capability Registry

Capabilities: `TextToSpeech`, `BackgroundRemoval`, `UpscaleImage`,
`SegmentPerson`, `RemoveNoise`, `EnhanceVoice` (`AICapability` enum,
`@motion-studio/shared`). Only `TextToSpeech` has real providers this
phase (`KokoroProvider`, `PiperProvider`) — the others are registered
enum values with no provider yet, same "capability exists, provider is
later" gap as every other unfulfilled DI boundary in this codebase. Each
capability may declare an `ICapabilityDescriptor` (required inputs/
outputs, preferred backend, estimated resource cost) via
`CapabilityRegistry.registerDescriptor()`; providers register separately
via `registerProvider()`, and `resolveProvider(capability, providerId?)`
picks the first-registered provider by default or a specific one by id.
This is the same registry-of-providers pattern used by the Tool System
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

Never bundled with the app. Downloaded on demand
(`IModelDownloader.download()`), checksum-verified (`sha256Hex` +
`downloadAndVerify()`, `model-downloader.ts`), stored via `IModelBlobStore`
(a DI interface a future VFS-backed OPFS store satisfies — AI never
touches IndexedDB/OPFS directly, per CLAUDE.md). Model metadata (id, url,
sha256, size) lives in `IModelDescriptor`, registered with `ModelManager`
via `registerModel()`. LRU eviction across loaded sessions is **not
implemented** — `ModelManager` only supports explicit `unload()`/
`unloadAll()`, same as GPU texture cache eviction being left open pending
a real memory budget number (CLAUDE.md "Known hard risks" #6).

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
that doesn't assume near-instant generation). Nothing implemented this
phase changes that gap: `KokoroProvider.synthesize()` is a single
non-streaming call, matching `kokoro-js`'s `generate()` (not `stream()`).

## Security

Model checksum verification before use (`downloadAndVerify()` throws
`ModelChecksumMismatchError` rather than handing unverified bytes to ONNX
Runtime) — implemented. Sandboxed inference workers, input validation
beyond checksum verification, and unrestricted remote model execution
guards are **not implemented**: everything in `packages/ai` runs on the
caller's thread today, same as Export's job runner and Assets' import
pipeline.
