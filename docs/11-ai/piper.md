# Piper

> Status: Not directly spiked. Kokoro was the model exercised in Spike B
> (`kokoro.md`) since `CLAUDE.md` allows either. The architectural point
> below is confirmed by extension; Piper's own load/generate numbers are
> still speculative and need their own pass before implementation.

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
