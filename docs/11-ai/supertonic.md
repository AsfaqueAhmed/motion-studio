# Supertonic

> Status: Registration plumbing implemented (Phase 13, 2026-07-07). See
> `packages/ai/src/voice-enhancer.ts`. No real Supertonic model ships.

Optional voice-enhancement post-processing stage — deliberately **separate
from `ITTSProvider`**, not a step inside `synthesize()`, so a caller can
skip it or swap enhancers without touching the TTS provider.

## `IVoiceEnhancer` (`voice-enhancer.ts`)

```ts
interface IVoiceEnhancer {
  readonly id: string;
  enhance(audio: ISynthesizedAudio): Promise<ISynthesizedAudio>;
}
```

`registerVoiceEnhancer(enhancer)` / `getVoiceEnhancer(id)` /
`clearVoiceEnhancers()` — a module-level registry, matching
`packages/export/src/wasm-fallback.ts`'s `registerWasmCodecProvider`
precedent exactly: real registration/lookup logic, no actual enhancement
model. `AIManager.enhanceVoice(audio, enhancerId)` is the only caller.

## Open questions

- No real Supertonic (or any) enhancer implementation exists — same
  "registration-only plumbing" gap as `ffmpeg.wasm` in Export.
- Whether enhancement should be chainable (multiple enhancers applied in
  sequence) is undecided — today's API applies exactly one per call.
