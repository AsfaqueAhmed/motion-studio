import { beforeEach, describe, expect, it } from "vitest";
import { AudioCodec, VideoCodec } from "./codecs";
import {
  clearWasmCodecProviders,
  getWasmCodecProvider,
  registerWasmCodecProvider,
  requiresUnavailableFallback,
} from "./wasm-fallback";

describe("wasm-fallback registry", () => {
  beforeEach(() => {
    clearWasmCodecProviders();
  });

  it("has no providers registered by default", () => {
    expect(getWasmCodecProvider(AudioCodec.AAC)).toBeUndefined();
  });

  it("registers and retrieves a provider by codec", () => {
    const provider = { codec: AudioCodec.AAC, encode: async (input: Uint8Array) => input };
    registerWasmCodecProvider(provider);
    expect(getWasmCodecProvider(AudioCodec.AAC)).toBe(provider);
  });

  it("requiresUnavailableFallback is true only when native fails and no WASM provider covers the gap", () => {
    expect(requiresUnavailableFallback(VideoCodec.VP9, false)).toBe(true);
    registerWasmCodecProvider({ codec: VideoCodec.VP9, encode: async (input) => input });
    expect(requiresUnavailableFallback(VideoCodec.VP9, false)).toBe(false);
    expect(requiresUnavailableFallback(VideoCodec.VP9, true)).toBe(false);
  });
});
