# Muxer

> Status: Spike A complete (2026-07-06). Dependency choice revised from
> original plan — see below.

## Finding: mp4-muxer is deprecated in favor of Mediabunny

The original plan called for `mp4box.js` (demux) + raw `VideoDecoder`/
`VideoEncoder` + `mp4-muxer` (mux) as three separate dependencies. While
building Spike A, `mp4-muxer`'s own package (`npm view mp4-muxer`) reported
itself deprecated:

> "This library is superseded by Mediabunny. Please migrate to it."

Mediabunny (`npm i mediabunny`, zero dependencies, MPL-2.0) is a single
TypeScript library that covers demuxing, muxing, and thin wrappers around
`VideoDecoder`/`VideoEncoder`/`AudioDecoder`/`AudioEncoder` — replacing
**both** `mp4box.js` and `mp4-muxer` in one dependency. It was already
name-checked in `CLAUDE.md`'s known-risks list as an alternative to
`mp4box.js` for demuxing; this spike confirms it covers the muxing side too.

**Decision:** use **Mediabunny** as the Export Engine's container read/write
dependency, not `mp4box.js` + `mp4-muxer`. This should be recorded as an ADR
in `docs/DECISIONS.md` before Phase 1 dependency setup.

## API shape (confirmed working)

```ts
import {
  Input,
  Output,
  BlobSource,
  BufferTarget,
  Mp4OutputFormat,
  ALL_FORMATS,
  CanvasSource,
  AudioBufferSource,
  VideoSampleSink,
  AudioBufferSink,
  canEncodeVideo,
  canEncodeAudio,
  QUALITY_HIGH,
} from "mediabunny";

// Read
const input = new Input({ source: new BlobSource(blob), formats: ALL_FORMATS });
const videoTrack = await input.getPrimaryVideoTrack();
const videoSink = new VideoSampleSink(videoTrack);
for await (const sample of videoSink.samples()) {
  sample.draw(ctx, 0, 0); // decoded frame is a canvas-drawable VideoSample
  sample.close();
}

// Write
const output = new Output({ format: new Mp4OutputFormat(), target: new BufferTarget() });
const videoSource = new CanvasSource(canvas, { codec: "avc", bitrate: QUALITY_HIGH });
output.addVideoTrack(videoSource, { frameRate: 30 });
await output.start();
await videoSource.add(timestampSeconds, durationSeconds); // captures canvas as a frame
await output.finalize();
const mp4Bytes = output.target.buffer; // ArrayBuffer, ready to Blob/save
```

Capability checks (`canEncodeVideo`, `canEncodeAudio`) let the Export Engine
probe codec support at runtime before committing to a preset — this is how
the AAC-on-Firefox gap in `webcodecs.md` was detected, and should be the
standard pattern for building the export preset list shown in the UI.

## Confirmed findings

- End-to-end MP4 write (H.264 video + Opus audio, and separately + AAC audio)
  worked on Chromium, Firefox, and WebKit via Mediabunny in this spike (see
  `webcodecs.md` for the pass/fail matrix).
- Mediabunny's `Output`/`BufferTarget` produces the final file in memory
  (`ArrayBuffer`); for large/long exports, Mediabunny also supports streaming
  targets — not exercised in this spike (3s test clip), needs a follow-up
  check before relying on it for long-form exports (memory ceiling).
- Non-WebCodecs-native codecs (AAC/MP3/FLAC in some browsers) have official
  Mediabunny polyfill packages (`@mediabunny/aac-encoder`, etc.) — an option
  if we want AAC export on Firefox despite the native gap, at the cost of a
  WASM encoder dependency. Not needed for MVP since Opus is the default.

## Open questions

- WebM/VP9 output path (for browsers/cases where H.264 licensing or hardware
  encode isn't available) — untested, same library should cover it via
  `WebMOutputFormat` but not exercised here.
- Streaming write target for exports that exceed comfortable in-memory buffer
  size — needs its own small spike before Export Engine (13) implementation.
