# Motion Studio — Soul File (CLAUDE.md)

You are building **Motion Studio** — a 100% browser-based, offline-capable
motion graphics engine. No media ever leaves the device. No server required
after first load.

---

## Read these first, every session

| File                     | Why                                                                          |
| ------------------------ | ---------------------------------------------------------------------------- |
| `docs/ARCHITECTURE.md`   | Single-page map of the whole system. **Authoritative over everything else.** |
| `docs/DECISIONS.md`      | Which design won and why. **Tiebreaker when docs conflict.**                 |
| `docs/GLOSSARY.md`       | Canonical names. **Use these in code — no synonyms.**                        |
| `docs/24-roadmap/mvp.md` | Where to start. Run the two spikes before any engine code.                   |

---

## The one rule that governs everything

**UI never calls an engine directly.**

Every user action → Intent → Editor Service → Typed Command(s) → Command Bus → Engine → Event Bus → React.

No exceptions. If you find yourself importing an engine's concrete class inside a React component, stop and introduce the Intent/Command layer.

---

## Canonical names (never invent synonyms)

| Use this                     | Never use                                           |
| ---------------------------- | --------------------------------------------------- |
| `Layer`                      | `Entity`, `Scene Graph Object`                      |
| `Composition Graph`          | "persistent scene graph", "layer hierarchy"         |
| `Scene Graph`                | Only for the ephemeral per-frame renderer structure |
| `Frame State`                | "render snapshot", "frame data"                     |
| `ViewportCamera`             | "Camera" (editing viewport pan/zoom)                |
| `SceneCamera`                | "Camera" (in-scene keyframeable entity)             |
| `AnimatablePropertyRegistry` | "Property Registry" (animation side)                |
| `PropertySchemaRegistry`     | "Property Registry" (inspector side)                |
| `Tick`                       | Never use floating-point seconds for internal time  |
| `VFS`                        | Never access IndexedDB/OPFS directly from engines   |

---

## Architecture rules (enforced, not optional)

- Engines communicate through interfaces (`I`-prefixed), events, and commands — **never by importing each other's concrete classes**.
- Only the Storage engine touches IndexedDB/OPFS. Everything else goes through the VFS.
- No business logic inside React components. Components dispatch Intents and render state only.
- Validation lives in command handlers (domain layer), not in UI components — commands can come from AI, plugins, macros, not just the Inspector.
- Internal time is always integer **Ticks**, never `number` seconds. `1s @ 30fps = 900 ticks` (configurable tick resolution).
- Frame State is **immutable**. The Renderer and Export Engine are both handed a Frame State — they never mutate project data.
- Preview and export must produce identical output. This is the single most important invariant to protect.

---

## Naming conventions (from `docs/STYLE_GUIDE.md`)

```
Classes          PascalCase              TimelineEngine
Interfaces       I + PascalCase          IProjectRepository
Enums            PascalCase              AnimationType
Hooks            use + camelCase         useTimeline()
Stores           use...Store             useTimelineStore()
Components       PascalCase .tsx         TimelinePanel.tsx
Folders          kebab-case              timeline-engine/
Commands         PascalCase + Command    DeleteLayerCommand
Intents          PascalCase + Intent     DeleteSelectionIntent
Events           PascalCase, past tense  LayerSelected, PlaybackStarted
```

---

## Engine ownership (what each engine owns and never touches)

| Engine         | Owns                                                | Never touches                                          |
| -------------- | --------------------------------------------------- | ------------------------------------------------------ |
| Core (04)      | Lifecycle, DI, scheduler, event bus, worker manager | Business logic                                         |
| Storage (12)   | IndexedDB + OPFS via VFS                            | Rendering, decoding, business logic                    |
| Assets (14)    | Import, catalog, dedup, dependency graph            | Decoding internals, UI                                 |
| Layer (08)     | The "what" — layer types and properties             | Time, rendering                                        |
| Timeline (07)  | The "when" — Composition → Track → TrackItem        | Rendering, decoding, storage                           |
| Animation (06) | Keyframes, interpolation, evaluation                | Rendering, storage                                     |
| Rendering (05) | Frame State → pixels (WebGPU/WebGL2/Canvas2D)       | Timeline logic, project mutation                       |
| Effects (09)   | Blur/glow/shadow/blend/filter nodes                 | Timeline, storage                                      |
| Audio (10)     | Web Audio graph, mixing, sync                       | File storage, decoding internals                       |
| Export (13)    | Frame evaluation → encoder → muxer → output         | Timeline mutation, rendering internals                 |
| AI (11)        | Capability-based inference (TTS, etc.)              | Timeline, rendering, storage internals                 |
| History (15)   | Command-pattern undo/redo                           | Rendering, storage                                     |
| Plugin (16)    | Registration/lifecycle                              | Direct engine internals (plugins see public APIs only) |

---

## Rendering fallback chain

```
WebGPU → WebGL2 → Canvas2D         (rendering)
WebCodecs → ffmpeg.wasm            (encode/decode for unsupported formats)
```

Every feature that depends on a partial-support browser API needs an explicit, tested fallback path — not just a comment saying "might not work."

**Shaders are NOT portable**: WGSL (WebGPU) ≠ GLSL (WebGL2). Every effect is authored twice, once per backend. Budget for this.

---

## Known hard risks — check before implementing

1. **WebCodecs has no built-in muxer.** Use `mp4-muxer` (or equivalent). It's a real dependency.
2. **AAC encoding**: unsupported in Firefox entirely and on desktop Linux. Default to **Opus**.
3. **MP3 encoding**: no browser has a native encoder. Needs WASM if required.
4. **Container demuxing**: WebCodecs decodes elementary streams only. MP4/MOV need `mp4box.js`/`Mediabunny`. AVI/MKV may need WASM.
5. **Audio clock drift**: `AudioContext.currentTime` and Tick clock diverge on long projects. Needs explicit resync strategy.
6. **GPU memory budget**: no concrete ceiling is specified yet. Don't implement LRU eviction until you have a real number.
7. **TTS model shape**: Kokoro and Piper are independent, interchangeable providers — not sequential stages of one pipeline. Verify actual architecture before coding.

---

## Graph primitives (ADR-005 — don't proliferate)

Start with three generic primitives, not one bespoke graph per engine:

1. **Dirty-tracked scene-graph/virtualization** → backs Rendering Engine (ephemeral per-frame), Timeline UI clip layout, Canvas overlays.
2. **Persistent hierarchy** (parent/child, visibility/lock inheritance) → backs Composition Graph + Asset Dependency Graph.
3. **DAG-with-cycle-detection evaluator** → backs Render Graph (effect chains), Animation blending/constraints, Export Graph.

If you're about to write a fourth graph type, stop and check if one of these covers the use case.

---

## Build order (start here)

### Step 0 — Spikes (MANDATORY before any engine code)

**Spike A — Export pipeline**
Prove: `VideoDecoder` → `OffscreenCanvas` → `VideoEncoder` → `mp4-muxer` → playable MP4.
Test H.264 + Opus first. Note which browsers fail AAC.
Document results in `docs/13-export/webcodecs.md` and `docs/13-export/muxer.md`.

**Spike B — In-browser TTS**
Load Kokoro (or Piper) via ONNX Runtime Web. Measure: cold load time, warm load time, generation time for ~10s sentence. Try WebGPU EP vs. WASM EP. Record actual model sizes.
Document results in `docs/11-ai/` (replace speculative content with real observations).

### Step 1 — Vertical slice (after both spikes pass)

Smallest real end-to-end slice:

- Core Engine: kernel, DI, event bus (minimal)
- Storage: OPFS + IndexedDB, VFS (minimal — projects + one asset type)
- Layer Engine: Video + Text only
- Timeline Engine: one Composition, tracks, TrackItems, tick playhead
- Rendering Engine: WebGPU only (no fallback yet), Frame State → Scene Graph → pixels
- Canvas UI: basic viewport, selection, move/trim
- Timeline UI: basic virtualized track/clip view
- Export: one preset (1080p30, H.264 + Opus)
- History: undo/redo for move/trim/delete

**Definition of done**: import a clip → trim → move → undo/redo → export → preview == export.

---

## Docs workflow

When implementing a phase, update the corresponding `docs/NN-*/` stub files with real findings — replace `> Status: Stub` placeholders with actual API shapes, resolved open questions, and any deviations from the original spec. The spike deliverables (`docs/13-export/webcodecs.md`, `docs/13-export/muxer.md`, `docs/11-ai/`) are the first examples of this.

Docs stay in sync with what's actually built, not what was speculatively planned.

---

## What not to do

- Don't add a UI fallback as the validation layer. Put validation in the command handler.
- Don't let a component import a concrete engine class. Depend on the `I`-prefixed interface.
- Don't use `float` seconds for internal time. Use `Tick`.
- Don't write a fourth graph type without checking ADR-005.
- Don't make audio use floating-point time for sync — two clock sources need explicit resync.
- Don't design the GPU memory LRU until you have a real memory budget number.
- Don't treat Kokoro and Piper as a pipeline — they're separate providers.
- Don't skip the spikes and go straight to engine code.

---

## Open ADRs (decisions not yet made — flag before implementing)

- **ADR-010**: Ripple editing with linked items — does ripple-delete on a video clip also ripple linked audio? Not yet decided. Recommended default: yes, ripple-follows-links (Premiere-style), with per-operation override.
- **GPU memory budget**: no number exists yet. Needed before LRU eviction can be implemented meaningfully.
- **Migration failure/rollback**: local-only app, so failed schema migration = potential unrecoverable project loss. Needs backup-before-migrate step.
- **Crash recovery consistency**: if a crash interrupts a multi-engine command mid-fan-out, is the recovered state consistent? Not yet designed.
