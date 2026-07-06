# Architecture Overview

One page, whole system. Everything else in this repo is detail underneath
this document. If a lower-level doc ever conflicts with this one, this one
wins (and the conflict should be logged in `DECISIONS.md`).

## 1. What this is

Motion Studio is a browser-based **motion graphics engine**, not "a video
editor" — the distinction matters because it's what justifies treating
every visual/audio/text object as a layer with universally animatable
properties, rather than special-casing "video editing features."

Non-negotiable product principles:

- Runs 100% in the browser, offline-capable after first load.
- No media ever leaves the device (privacy-first, local-only storage).
- GPU-accelerated where available, with graceful fallback where not.

## 2. The two halves of the system

```
                    ┌─────────────────────────────┐
                    │        Editor Framework      │   (17-ui/, 04-core panels)
                    │  Panels · Canvas · Toolbar    │   React hosts these engines,
                    │  Inspector · Timeline UI       │   never implements editing
                    │  Command System · Overlays    │   logic itself.
                    └───────────────┬───────────────┘
                                    │ Command Bus / Event Bus / Intent Layer
                    ┌───────────────┴───────────────┐
                    │          Core Engines          │   (04 through 16)
                    │  Core · Storage · Assets       │   Independent, communicate
                    │  Layer · Timeline · Animation   │   only through interfaces,
                    │  Rendering · Audio · Export     │   events, and commands.
                    │  AI · History · Plugin · Effects│   Never import each other
                    └────────────────────────────────┘   directly.
```

Rule: **UI never talks to an engine directly.** Every user action becomes
an Intent, which a Service resolves into one or more typed Commands, which
the Command Bus dispatches to the owning engine. This is what keeps 15+
independent engines from turning into a tangled mesh as the app grows.

## 3. The Core Engines, and what each owns

| Engine               | Owns                                                                               | Never touches                                               |
| -------------------- | ---------------------------------------------------------------------------------- | ----------------------------------------------------------- |
| **Core** (`04`)      | Lifecycle, DI, scheduling, event bus, worker manager                               | Any business logic                                          |
| **Storage** (`12`)   | IndexedDB (structured data) + OPFS (binaries), via a VFS abstraction               | Rendering, decoding, business logic                         |
| **Assets** (`14`)    | Import, catalog, tag, search, dedup, dependency graph — **the single asset store** | Decoding internals (delegates to worker pipelines), UI      |
| **Layer** (`08`)     | The canonical "what" — image/video/text/shape/group definitions                    | Time (Timeline's job), rendering (Renderer's job)           |
| **Timeline** (`07`)  | The canonical "when" — Composition → Track → TrackItem, referencing Layers by ID   | Rendering, decoding, storage                                |
| **Animation** (`06`) | Per-property keyframes/interpolation, evaluated per frame                          | Rendering, storage                                          |
| **Rendering** (`05`) | Frame State → pixels, via WebGPU/WebGL2/Canvas2D backends                          | Timeline logic, animation logic, project mutation           |
| **Effects** (`09`)   | Blur/glow/shadow/blend/filter nodes consumed by the Render Graph                   | Timeline, storage                                           |
| **Audio** (`10`)     | Web Audio graph, mixing, sync to Timeline ticks                                    | File storage, decoding internals                            |
| **Export** (`13`)    | Frame Evaluation → Encoder → Muxer → Output, sharing the exact preview pipeline    | Timeline mutation, rendering internals                      |
| **AI** (`11`)        | Capability-based inference orchestration (TTS, background removal, etc.)           | Timeline, rendering, storage internals                      |
| **History** (`15`)   | Command-pattern undo/redo                                                          | Rendering, storage                                          |
| **Plugin** (`16`)    | Registration/lifecycle for effects, tools, panels, exporters, AI capabilities      | Direct engine internals — plugins only ever see public APIs |

Every engine follows the same non-negotiable rule set (from `02-system-architecture/module-boundaries.md`):
dependencies point in one direction only, communication is through
interfaces/events/commands, and nothing reaches into another engine's
private state.

## 4. The central data contract: Frame State

This is the single most important idea in the whole architecture, and the
reason preview and export are guaranteed to produce identical output:

```
Timeline (tick) → Animation (evaluate) → Layer data → Frame State
                                                            │
                                    ┌───────────────────────┼───────────────────────┐
                                    ▼                                               ▼
                          Rendering Engine                                  Export Engine
                          (live preview, WebGPU/WebGL2)              (same evaluation, offline)
```

`Frame State` is an **immutable, deterministic snapshot** of everything
visible/audible/active at a given tick. The Renderer and the Export Engine
never ask "what's on the timeline right now" — they are only ever handed
a Frame State and asked to turn it into pixels/audio. This is what
guarantees what-you-see-is-what-you-export.

Known open item: Frame State's evaluation cost must be **incremental**
(only re-resolve what changed since the last tick), not a full
re-evaluation every frame — this is asserted as a performance requirement
but not yet designed in detail. See `05-rendering-engine/frame-rendering.md`
and `24-roadmap/mvp.md`.

## 5. The UI action pipeline

One consistent path from any input source to any engine mutation:

```
Keyboard / Toolbar / Menu / Gesture / AI / Plugin / Macro
                    │
                    ▼
                 Intent            ("delete the selection" — WHAT, not HOW)
                    │
                    ▼
             Editor Service        (resolves intent into 1+ concrete commands)
                    │
                    ▼
          Typed Command(s)         (compile-time-checked, e.g. DeleteLayerCommand)
                    │
                    ▼
             Command Bus  ────────────────► History Engine (undo/redo)
                    │
                    ▼
             Owning Engine(s)
                    │
                    ▼
               Event Bus  ────────────────► React store / UI refresh
```

The canonical spec for this pipeline lives in `17-ui/shortcuts.md`
(Command System) and `17-ui/panels.md` (Intent Layer) — see
`DECISIONS.md` ADR-001 for why those two used to be duplicated and now
aren't.

## 6. Known architectural risk areas (read before implementing)

These are confirmed, concrete gaps found during design review — not
hypothetical concerns:

1. **Export/muxing.** WebCodecs has no built-in container muxer; a
   third-party muxer library is a hard dependency, not glue code. AAC
   encoding is unsupported in Firefox entirely and on desktop Linux; MP3
   encoding has no browser-native encoder at all. See `13-export/`.
2. **Shader portability.** WebGPU (WGSL) and WebGL2 (GLSL) shaders are not
   portable — every effect must be authored once per backend. This roughly
   doubles the ongoing cost of shipping new visual effects. See
   `05-rendering-engine/shader-system.md`.
3. **Container demuxing.** WebCodecs decodes elementary streams only;
   MP4/MOV need a demuxer library, and formats like AVI/MKV may have no
   clean native path at all.
4. **Audio clock drift.** `AudioContext.currentTime` and Timeline's
   integer-tick clock are two different clocks; long (2h+) projects need
   an explicit resync strategy, not just "driven by ticks."
5. **TTS pipeline shape.** Treat Kokoro and Piper as independent,
   interchangeable, complete TTS providers behind the Capability Registry
   — not as sequential stages of one pipeline. Verify each model's actual
   architecture before implementing.

`24-roadmap/mvp.md` proposes de-risking (1) and (5) with small standalone
spikes before any further engine implementation — this is the single
highest-leverage recommendation in this whole corpus.

## 7. The graph-proliferation decision

Earlier drafts of this architecture independently invented roughly ten
different tree/DAG structures (Render Graph, Media Graph, Selection Graph,
Timeline Evaluation Graph, Animation Graph, Export Graph, Timeline Scene
Graph, Property Graph, Composition Graph, Asset Dependency Graph). Most of
these are genuinely different _use cases_ but very similar _shapes_ (nodes
with bounds/visibility/dirty-state/dependency metadata).

**Decision:** implementation should start with the minimum number of
actual generic graph primitives and add specialized ones only when a real
need proves the generic one insufficient. See `DECISIONS.md` ADR-005 for
the reasoning and a proposed starting set.

## 8. Naming

See `GLOSSARY.md`. A few terms (`Layer`, `Scene Graph`, `Camera`,
`Property Registry`) meant different things in different earlier drafts.
The glossary is the tiebreaker — use those definitions in code.
