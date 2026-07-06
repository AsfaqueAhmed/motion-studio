# Roadmap (summary)

Full detail lives in `24-roadmap/mvp.md`, `v1.md`, `v2.md`, `v3.md`. This
file is the one-paragraph-per-stage summary.

## Stage 0 — Spikes (do this before writing further engine code)

Two small, throwaway prototypes to de-risk the two biggest unknowns
uncovered during design review:

1. **Export spike:** decode/render one clip, encode it with WebCodecs,
   mux it into a playable MP4 using a real muxer library, play it back.
   This single exercise validates or invalidates a large fraction of the
   Export Engine's design in a few days, instead of discovering gaps after
   the full engine is built.
2. **TTS spike:** load Kokoro or Piper via ONNX Runtime Web, generate
   speech from text, entirely in-browser. Confirms actual model size,
   load time, and generation speed against the performance goals already
   written down — and confirms which of the two models is architecturally
   what the docs assume it is.

Neither spike needs to be pretty or reused — the goal is information, not
shippable code.

## Stage 1 — MVP

Minimum viable vertical slice: Core Engine + Storage + Layer + Timeline +
Rendering (single backend, no effects) + a basic Canvas + Timeline UI +
Export (single preset). Enough to import a clip, trim it, and export it.
Everything else (Animation, Audio, AI, Effects, Plugins) comes after this
slice proves the Command Bus / Event Bus / Frame State pipeline actually
works end to end in real code.

## Stage 2 — v1

Full engine set from `ARCHITECTURE.md` §3, full editor framework from
`17-ui/`, single-clip and multi-track editing, keyframe animation, basic
effects, AI narration.

## Stage 3 — v2

Nested compositions, advanced effects (masks, mattes), plugin SDK
opened to third parties, expanded export targets.

## Stage 4 — v3

Cloud sync (optional), collaboration, template marketplace.

---

**Why spikes come before Stage 1, not during it:** every prior attempt at
this project moved from Phase 1 through roughly nineteen rounds of
architecture documentation without writing a line of implementation code.
By the time the Export and AI engines were designed in detail, several of
their core technical assumptions turned out — on inspection — to have
real, concrete gaps (missing muxer, codec support gaps, an assumed
Kokoro/Piper pipeline shape that likely doesn't match either model's
actual architecture). Two days of hands-on prototyping would have
surfaced all of this immediately. Do the spikes first.
