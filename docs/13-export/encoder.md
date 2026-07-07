# Encoder

> Status: Phase 10 complete (2026-07-07). Real capability-resolution logic
> shipped; the encoder calls themselves are still Mediabunny's job (via
> `IVideoTrackSource`/`IAudioTrackSource` in `container.ts`), not a
> separate encoder wrapper — see "Why no `IVideoEncoder` wrapper" below.

## Codec support notes

- **H.264 (`avc`)**: universal — confirmed on Chromium, Firefox, and WebKit
  in Spike A (`webcodecs.md`). Primary video codec.
- **VP9 (`vp9`)**: secondary/fallback video codec, paired with the WebM
  container (`ContainerFormat.WebM`). Not exercised in Spike A; Mediabunny
  is expected to cover it (`muxer.md` open questions), unverified.
- **AV1/HEVC**: hardware-encode support still limited/inconsistent across
  browsers — not implemented as a preset option at all yet.
- **Opus**: primary audio codec, and the only one guaranteed available
  everywhere (`webcodecs.md`). Default per CLAUDE.md's risk list.
- **AAC**: confirmed unsupported in Firefox (all platforms) and on desktop
  Linux generally (`webcodecs.md`). Available as an opt-in preferred codec,
  gated by real capability probing — never assumed.
- **MP3**: no browser has a native encoder via WebCodecs at all. Needs the
  WASM fallback path (`ffmpeg-wasm.md`) if ever required — not on the
  current preset list (`export-presets.md`).

## Capability resolution (`packages/export/src/codecs.ts`)

```ts
resolveVideoCodec(probe, preferred): Promise<VideoCodec>; // H.264 → VP9 → throw
resolveAudioCodec(probe, preferred): Promise<AudioCodec>; // preferred → Opus → throw
```

`IEncodeCapabilityProbe` is a two-method DI interface
(`canEncodeVideo`/`canEncodeAudio`) matching Mediabunny's own capability
check functions (`muxer.md`) — the real implementation is a thin pass-
through to Mediabunny's `canEncodeVideo`/`canEncodeAudio`. Tests
(`codecs.test.ts`) use `FakeCapabilityProbe` to exercise every fallback
branch (including "neither supported" → `UnsupportedCodecError`) without a
real browser.

## Why no `IVideoEncoder`/`IAudioEncoder` wrapper

The original checklist item read "`VideoEncoder` wrapper" / "`AudioEncoder`
wrapper," but Mediabunny's own `CanvasSource`/`AudioBufferSource`
(`muxer.md`) already wrap `VideoEncoder`/`AudioEncoder` internally — a
`CanvasSource.add(timestamp, duration)` call captures the canvas and
encodes it in one step. Wrapping WebCodecs directly (bypassing Mediabunny)
would mean re-implementing the muxer-track plumbing Mediabunny already
does correctly. `container.ts`'s `IVideoTrackSource`/`IAudioTrackSource`
are the wrapper, one level higher than raw WebCodecs, matching the actual
API surface this package calls.

## Open questions

- No hardware-vs-software encode path distinction anywhere yet (Spike A
  didn't measure this either — see `webcodecs.md` open questions).
- Bitrate values in `export-presets.md` are reasonable defaults, not
  measured against real encoder output quality.
