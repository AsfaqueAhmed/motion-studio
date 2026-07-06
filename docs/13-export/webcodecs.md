# Webcodecs

> Status: Spike A complete (2026-07-06). Findings below replace speculation.

## Spike A results — export pipeline proof

Pipeline tested: decode source MP4 → draw frame to canvas + overlay (simulated
render step) → re-encode → mux → play back result in a `<video>` tag.

Test harness: `spikes/spike-a-export/` (Vite + TypeScript, throwaway — not part
of the package layout in `PLAN.md`). Source: 3s synthetic 640×360 H.264 video +
440Hz sine wave AAC audio, generated with ffmpeg.

Driven headlessly via Playwright across its three browser engines (Chromium,
Firefox, WebKit — the same engines underlying Chrome/Edge, Firefox, and Safari
respectively). Raw output: `spikes/spike-a-export/run-spike.mjs`.

| Check                                                               | Chromium                                        | Firefox                      | WebKit                       |
| ------------------------------------------------------------------- | ----------------------------------------------- | ---------------------------- | ---------------------------- |
| `VideoDecoder`/`VideoEncoder`/`AudioEncoder`/`AudioDecoder` present | ✅                                              | ✅                           | ✅                           |
| `OffscreenCanvas` present                                           | ✅                                              | ✅                           | ✅                           |
| `canEncodeVideo('avc')` (H.264)                                     | ✅                                              | ✅                           | ✅                           |
| Decode → canvas render → encode → mux → play, **Opus** audio        | ✅ (90 frames, 131 audio buffers, 168.6 KB out) | ✅ (90 frames, 156.0 KB out) | ✅ (90 frames, 115.5 KB out) |
| `canEncodeAudio('aac')`                                             | ✅                                              | **❌ unsupported**           | ✅                           |
| Decode → canvas render → encode → mux → play, **AAC** audio         | ✅ (139.0 KB out)                               | skipped (unsupported)        | ✅ (84.6 KB out)             |

**Pass criteria met:** playable MP4 with H.264 + Opus produced on all three
engines, confirming the required Chrome/Edge pass bar with room to spare.

## Confirmed findings

- **WebCodecs has no built-in muxer.** Confirmed — see `muxer.md`. Decode and
  encode are elementary-stream-only; container read/write is a separate
  concern.
- **AAC encoding is unsupported in Firefox.** Confirmed via
  `canEncodeAudio('aac')` returning `false` on Firefox in this spike. **Default
  to Opus** for the export pipeline, matching `CLAUDE.md`'s existing guidance.
  AAC can still be offered as an opt-in export preset on Chromium/WebKit-based
  browsers, gated behind the same capability check used here
  (`canEncodeAudio`).
- The render step (drawing decoded frames to `OffscreenCanvas`, then
  overlaying content before encoding) does not break the pipeline — decoded
  frames are ordinary canvas-drawable sources, and the encoder captures
  whatever is on the canvas at `add()` time. This is the shape the real
  Rendering Engine will plug into: render Frame State to the export canvas,
  then hand that canvas to the video encoder track.
- Container demuxing/muxing was **not** done with `mp4box.js` + `mp4-muxer` as
  originally planned — see `muxer.md` for why.

## Open questions

- Real-world footage (varied resolutions, variable frame rate, B-frames,
  rotated/odd-dimension sources) is untested — this spike used a single
  synthetic constant-frame-rate clip. Revisit once the Assets Engine can
  import arbitrary user files.
- WebKit here is Playwright's bundled engine, not shipped Safari on macOS/iOS.
  Worth a manual confirmation pass in real Safari before relying on the AAC
  result there.
- Hardware vs. software encode path was not distinguished; timings above are
  not representative of real encode performance (clip is 3s, 640×360).
