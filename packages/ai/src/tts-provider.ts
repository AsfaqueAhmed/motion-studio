import type { AICapability } from "@motion-studio/shared";
import type { ICapabilityProvider } from "./capability-registry";

/**
 * Decoded PCM output. A hand-rolled structural subset of the real
 * `AudioBuffer` (sample rate, channel count, per-channel `Float32Array`
 * samples) rather than `lib.dom`'s `AudioBuffer` type — same DI motivation
 * as `packages/audio/src/audio-context.ts`'s own `IAudioBuffer`, but defined
 * independently here since AI has no dependency on `@motion-studio/audio`
 * (CLAUDE.md: engines never import each other's concrete packages). A host
 * app can wrap this into a real `AudioBuffer` via
 * `audioContext.createBuffer()` + `copyToChannel()`.
 *
 * `docs/11-ai/voice-cache.md`: "Generated audio cached and treated as
 * ordinary media once produced" — once a caller has an `ISynthesizedAudio`,
 * handing it to the Asset Manager as an ordinary imported asset is the
 * caller's job (the future Editor Service), not this package's — AI never
 * imports `@motion-studio/assets`.
 */
export interface ISynthesizedAudio {
  readonly sampleRate: number;
  readonly numberOfChannels: number;
  readonly durationSeconds: number;
  readonly channelData: readonly Float32Array[];
}

/** `ITTSProvider` (PLAN.md Phase 13): `synthesize(text, voice) → AudioBuffer`, `AudioBuffer` narrowed to `ISynthesizedAudio` per the note above. */
export interface ITTSProvider extends ICapabilityProvider {
  readonly capability: AICapability.TextToSpeech;
  synthesize(text: string, voiceId: string): Promise<ISynthesizedAudio>;
}
