# MVP Plan

## Step 0 — Spikes (mandatory, before any further engine implementation)

### Spike A: Export pipeline

Goal: prove or disprove that WebCodecs → mux → playable file actually
works end to end.

1. Take one short video clip (a few seconds).
2. Decode it with `VideoDecoder`.
3. Draw a couple of frames to an `OffscreenCanvas` (simulate "rendering").
4. Re-encode with `VideoEncoder` (H.264, broadest support).
5. Mux the encoded chunks into an MP4 using `mp4-muxer` (or equivalent).
6. Play the resulting file back in a `<video>` tag.
7. Repeat step 5 with an audio track and `AudioEncoder` (Opus first —
   broadest support — then try AAC and note which platforms fail).

Deliverable: a short written note in `13-export/webcodecs.md` and
`13-export/muxer.md` recording exactly what worked, what didn't, and on
which browsers — replacing the speculative content there.

### Spike B: In-browser TTS

Goal: confirm real model size, load time, and generation speed; confirm
actual model architecture (single end-to-end model vs. multi-stage
pipeline).

1. Load Kokoro (or Piper) via ONNX Runtime Web.
2. Time: cold load, warm load, and generation time for a ~10-second
   sentence.
3. Try both the WebGPU and WASM execution providers, compare.
4. Note actual downloaded model size.

Deliverable: replace the speculative pipeline description in `11-ai/kokoro.md`
and `11-ai/piper.md` with what was actually observed, and put real numbers
against the performance goals in `11-ai/overview.md`.

## Step 1 — Vertical slice

Once both spikes are done, build the smallest possible real slice that
exercises the full architecture end to end:

- Core Engine: kernel, DI, event bus (minimal).
- Storage: OPFS + IndexedDB, VFS abstraction (minimal — projects + one
  asset type).
- Layer Engine: Video and Text layer types only.
- Timeline Engine: one Composition, a couple of tracks, TrackItems,
  integer-tick playhead.
- Rendering Engine: one backend only (WebGPU, no fallback yet), Frame
  State → Scene Graph → pixels, no effects yet.
- Canvas: basic viewport, selection, move/trim.
- Timeline UI: basic virtualized track/clip view.
- Export: single preset (1080p30, H.264 + Opus, using what Spike A
  proved works), reusing the same Frame State pipeline as preview.
- History: undo/redo for move/trim/delete only.

Explicitly deferred to Stage 2: Animation Engine, Audio Engine beyond
basic playback, AI Engine, Effects Engine, Plugin System, multi-backend
rendering fallback.

**Definition of done for this slice:** import a clip, trim it on a
timeline, move it, undo/redo those operations, and export a file that
plays back correctly — with the preview and the export looking identical.
This one property (preview == export) is the single most important thing
to validate, since the entire architecture is built around Frame State
guaranteeing it.
