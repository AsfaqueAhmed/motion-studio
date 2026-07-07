# Ffmpeg Wasm

> Status: Phase 10 complete (2026-07-07) — registration plumbing only, no
> actual `ffmpeg.wasm` module ships. `packages/export/src/wasm-fallback.ts`.

## Scope

WebCodecs has no native encoder at all for some formats (MP3 — CLAUDE.md
"Known hard risks" #3) and no encoder on some platforms for others (AAC on
Firefox/desktop Linux, confirmed in `webcodecs.md`). A real WASM fallback
needs an actual encoder module (`ffmpeg.wasm` or a narrower purpose-built
WASM encoder) wired into the pipeline — that's real, non-trivial work
(loading a multi-MB WASM binary, feeding it raw samples, reading back
encoded output) that no phase has done yet, the same way Phase 9 left
AudioWorklet DSP (Noise Gate/Pitch Shift/Speed) as registration-only.

What Phase 10 actually built is the seam a real provider plugs into:

```ts
interface IWasmEncoderProvider {
  readonly codec: VideoCodec | AudioCodec;
  encode(input: Uint8Array, options?: Record<string, unknown>): Promise<Uint8Array>;
}

registerWasmCodecProvider(provider: IWasmEncoderProvider): void;
getWasmCodecProvider(codec: VideoCodec | AudioCodec): IWasmEncoderProvider | undefined;
requiresUnavailableFallback(codec, nativeSupported: boolean): boolean;
```

`requiresUnavailableFallback` is the real logic: true only when native
capability probing (`codecs.ts`'s `resolveVideoCodec`/`resolveAudioCodec`)
has already failed _and_ no WASM provider is registered for that codec
either — i.e. there is genuinely no encode path left. `export-job.ts`
doesn't call into this module yet; codec resolution failure currently just
fails the job (`UnsupportedCodecError`) rather than falling back. Wiring
`runExportJob` to try a registered WASM provider before giving up is the
next real step here, once an actual provider exists to register.

## Open questions

- No real provider exists yet — needs its own small spike (load time,
  encode throughput for a WASM MP3/AAC encoder) before committing to it as
  a real fallback path, similar in spirit to Spike A/B.
- `IWasmEncoderProvider.encode`'s signature (`Uint8Array` in, `Uint8Array`
  out) is a guess at the shape a real encoder would need — unverified
  against any actual WASM encoder API.
