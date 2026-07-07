import type { ISynthesizedAudio } from "./tts-provider";

/**
 * `docs/11-ai/supertonic.md`: "Optional voice-enhancement post-processing
 * stage" — deliberately **separate** from `ITTSProvider`, not a step inside
 * `synthesize()`, so a caller can choose to skip it (or swap enhancers)
 * without touching the TTS provider at all. Registration-only plumbing,
 * matching `packages/export/src/wasm-fallback.ts`'s
 * `registerWasmCodecProvider` precedent: real selection logic here, no
 * actual Supertonic model ships in this package.
 */
export interface IVoiceEnhancer {
  readonly id: string;
  enhance(audio: ISynthesizedAudio): Promise<ISynthesizedAudio>;
}

const enhancers = new Map<string, IVoiceEnhancer>();

export function registerVoiceEnhancer(enhancer: IVoiceEnhancer): void {
  enhancers.set(enhancer.id, enhancer);
}

export function getVoiceEnhancer(id: string): IVoiceEnhancer | undefined {
  return enhancers.get(id);
}

export function clearVoiceEnhancers(): void {
  enhancers.clear();
}
