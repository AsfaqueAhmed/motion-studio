# Piper

> Status: Not directly spiked. Kokoro was the model exercised in Spike B
> (`kokoro.md`) since `CLAUDE.md` allows either. The architectural point
> below is confirmed by extension; Piper's own load/generate numbers are
> still speculative. `PiperProvider` (Phase 13, 2026-07-07,
> `packages/ai/src/piper-provider.ts`) implements the correct _shape_
> (an independent `ITTSProvider`) with **placeholder tensor names** — see
> "Implementation (Phase 13)" below.

Piper TTS backend — treat as an independent, complete, interchangeable TTS
provider via the Capability Registry, **not** a sequential stage after
Kokoro. Spike B confirmed this shape for Kokoro (single ONNX graph, JS-side
phonemization, no separate stages) — Piper is architecturally the same kind
of thing (its own complete model), just a different provider behind the same
`TextToSpeech` capability. See `kokoro.md` for the confirmed pattern and
`overview.md` for how providers plug into the Capability Registry.

## Open questions

- Real load time, generate time, and model size for Piper are unmeasured.
  Piper models are generally much smaller than Kokoro-82M (commonly tens of
  MB rather than ~90-330 MB) — if Kokoro's cold-load time or its 14s
  warm-generate time (see `kokoro.md`) turns out to be unacceptable, Piper is
  the natural fallback to spike next, not a fp32/quantization tweak of
  Kokoro.
- Confirm which JS runtime/wrapper to use (e.g. `@diffusionstudio/vits-web`,
  `piper-tts-web`, or a direct ONNX Runtime Web + Piper voice file
  integration) — not evaluated in this spike.
- Voice selection/quality tradeoffs vs. Kokoro's voice bank are unassessed.

## Implementation (Phase 13) — `PiperProvider`

`packages/ai/src/piper-provider.ts` implements `ITTSProvider` on the same
`ModelManager`/`IOnnxRuntime` backend as `KokoroProvider`, proving the
architectural point above: Piper is a complete, independent provider
behind `TextToSpeech`, not a stage after Kokoro. Unlike `KokoroProvider`,
**its tensor names are not verified against any real Piper export** —
`inputTensorName`/`outputTensorName` default to `"input"`/`"output"`
(common ONNX export names) and `sampleRate` must be supplied per registered
model since it's unmeasured (commonly 16 kHz or 22.05 kHz for Piper
voices, per the note above, but not confirmed for any specific voice).
Correcting these names/rates is exactly the "own pass before
implementation" this doc's original status line called for — not done
here.
