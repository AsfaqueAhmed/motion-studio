import type { AudioCodec, VideoCodec } from "./codecs";

/**
 * `docs/13-export/ffmpeg-wasm.md`. WebCodecs has no native encoder at all
 * for some formats (MP3 — CLAUDE.md "Known hard risks" #3) and no encoder
 * on some platforms for others (AAC on Firefox/desktop Linux). This module
 * is registration plumbing only, matching
 * `packages/audio/src/effects.ts`'s `createAudioWorkletEffectNode`: real
 * selection logic, no actual `ffmpeg.wasm` module ships here — a host app
 * registers a real provider (e.g. wrapping `@ffmpeg/ffmpeg`) later.
 */
export interface IWasmEncoderProvider {
  readonly codec: VideoCodec | AudioCodec;
  encode(input: Uint8Array, options?: Record<string, unknown>): Promise<Uint8Array>;
}

const providers = new Map<VideoCodec | AudioCodec, IWasmEncoderProvider>();

export function registerWasmCodecProvider(provider: IWasmEncoderProvider): void {
  providers.set(provider.codec, provider);
}

export function getWasmCodecProvider(
  codec: VideoCodec | AudioCodec,
): IWasmEncoderProvider | undefined {
  return providers.get(codec);
}

export function clearWasmCodecProviders(): void {
  providers.clear();
}

/** True when native capability probing failed and no WASM provider is registered either — the caller has no encode path left. */
export function requiresUnavailableFallback(
  codec: VideoCodec | AudioCodec,
  nativeSupported: boolean,
): boolean {
  return !nativeSupported && !providers.has(codec);
}
