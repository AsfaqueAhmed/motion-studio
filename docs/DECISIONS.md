# Decisions Log (ADRs)

This project went through many rounds of iterative design. Because each
round was drafted somewhat independently, several subsystems ended up
specified more than once, a few terms were used ambiguously, and some
technical assumptions were never checked against reality. This log is the
tiebreaker: where an earlier draft conflicts with what's recorded here,
**this document wins**.

Each entry: the problem, the decision, and where the canonical version now
lives.

---

## ADR-001 — Tool System and Intent Layer: pick one canonical version

**Problem:** The Tool interface, Tool Manager, and built-in tool list were
fully specified twice (once as part of the editor's core orchestration
layer, once again as part of the toolbar/tool-system design). The Intent
Layer (e.g. `DeleteSelectionIntent` fanning out into multiple typed
commands) was also fully specified twice, using nearly the same example
both times.

**Decision:**

- Canonical **Tool System** (interface, registry, session-per-activation,
  capability-based availability) lives in `17-ui/toolbar.md`.
- Canonical **Intent Layer** lives in `17-ui/panels.md`, referenced by
  `17-ui/shortcuts.md` (Command System) rather than redefined there.
- `04-core/*` should reference these, not redefine them.

**Why this direction:** the tool-system draft that came second had the
more complete idea (Tool Session), and the intent-layer draft that came
first is more foundational to where it now lives (editor orchestration
layer, closest to where Commands and Services are defined).

---

## ADR-002 — Asset management: one engine, not two

**Problem:** Media/Asset management was fully specified twice: once as an
engine (import pipeline, media library, categories, favorites, dedup,
public API), once again as a UI-facing "Assets Panel" with a near-identical
registry, database, categories, and public API.

**Decision:** There is **one** asset management engine (`14-assets/`).
`17-ui/asset-browser.md` is a thin UI view over it — it owns no registry,
no database, and no dedup logic of its own. If browsing needs (collections,
saved filters, "unused assets" view) require additional state, that state
lives in the UI layer as _view configuration_, not as a second source of
truth for what assets exist.

The **Asset Dependency Graph** (which compositions/clips/templates
reference an asset; safe-delete warnings; orphan cleanup) is a real,
additional capability worth keeping — it lives in `14-assets/metadata.md`,
merged with the "unused assets" idea (unused = zero incoming references),
rather than as two separate mechanisms.

---

## ADR-003 — One canonical "what": the Layer

**Problem:** Three different names were introduced across different
drafts, each described as "the thing everything else references":
`Entity` (in the Timeline design), `Layer` (in the Selection design, "the
Layer Engine remains the source of truth"), and `Scene Graph Object` (in
an early Layers Panel design). No draft ever explicitly reconciled these,
but the described behavior (one object, referenced by many TrackItems,
holding type + properties, independent of time) is the same concept each
time.

**Decision:** The canonical name is **Layer**, specified in the new
`08-layer-engine/` folder. `Entity` and `Scene Graph Object` are retired —
anywhere older text says "Entity" or "Scene Graph Object" in the sense of
"what something is," read it as `Layer`.

---

## ADR-004 — Rendering: one GPU backend abstraction, not four

**Problem:** Four different subsystems each specified their own GPU
rendering path: the Rendering Engine's `IRenderBackend` (WebGPU/WebGL2/
Canvas2D), the Canvas System's overlay renderer, the Timeline UI's
"Virtual Clip Renderer → GPU Canvas," and implicitly the Layers Panel's
tree renderer. All four are solving the same underlying problem: draw a
virtualized, styled set of visible primitives efficiently.

**Decision:** `05-rendering-engine`'s `IRenderBackend` is the **one** GPU
abstraction in the system. Canvas overlays and Timeline UI's clip
rendering are documented as _consumers_ of this backend (`17-ui/timeline-ui.md`,
Canvas overlay notes), not as independent renderers. If a consumer
genuinely needs something the shared backend can't do, that's a signal to
extend the backend, not fork a new one.

---

## ADR-005 — Graph proliferation: converge on a small set of primitives

**Problem:** Across the full design history, roughly ten different
tree/DAG structures were independently specified: Render Graph, Media
Graph, Selection Graph, Timeline Evaluation Graph, Animation Graph, Export
Graph, Timeline Scene Graph, Property Graph, Composition Graph, Asset
Dependency Graph. Several have nearly identical shapes (nodes carrying
bounds/visibility/dirty-state/dependency metadata) despite being
specified independently.

**Decision:** Implementation should start with a small number of actual
generic primitives, used by multiple consumers, rather than one bespoke
graph type per engine:

1. **A generic dirty-tracked scene-graph/virtualization primitive** —
   backs Rendering Engine's ephemeral per-frame scene graph, Timeline UI's
   clip layout, and Canvas overlay nodes. One implementation, multiple
   typed instantiations.
2. **A generic persistent hierarchy primitive** (parent/child, visibility
   and lock inheritance) — backs the Composition Graph (`08-layer-engine/group-layer.md`)
   and the Asset Dependency Graph (`14-assets/metadata.md`).
3. **A generic DAG-with-cycle-detection evaluator** — backs the Render
   Graph (effect chains), the Animation Engine's blending/constraints/
   expressions evaluation order, and the Export Graph (independent output
   branches sharing one render pass).

Anything currently named "X Graph" in a stub file should, during
implementation, be checked against this list before writing a new,
fourth kind of graph structure.

---

## ADR-006 — Scene Graph: two meanings, two names

**Problem:** "Scene Graph" was used for two genuinely different things:
an _ephemeral, per-frame_ structure the Renderer builds from Frame State
and destroys after each frame, and a _persistent, project-level_ structural
hierarchy of compositions/groups/parenting.

**Decision:**

- **Scene Graph** (ephemeral, per-frame, rendering-only) —
  `05-rendering-engine/scene-graph.md`.
- **Composition Graph** (persistent, project data, structural hierarchy) —
  `08-layer-engine/group-layer.md`.

The relationship: the Rendering Engine's per-frame Scene Graph is built
_from_ Frame State, which is itself derived from evaluating the persistent
Composition Graph at a given tick. Document this relationship explicitly
wherever both are referenced.

---

## ADR-007 — "Camera" means two different things

**Problem:** "Camera" was used for both the editing viewport (pan/zoom
while working, ephemeral UI state, never saved as part of the rendered
output) and an in-scene camera entity (a future track type representing
an actual virtual camera move as part of the composition).

**Decision:** Rename to `ViewportCamera` (editing viewport — lives in the
Canvas System UI layer) and `SceneCamera` (in-scene entity — a Layer type
in `08-layer-engine/`, referenced by a Camera Track in
`07-timeline-engine/tracks.md`).

---

## ADR-008 — Two different "Property Registry"s

**Problem:** "Property Registry" named both the Animation Engine's
registry of animatable properties (type, default, interpolator) and the
Inspector's registry mapping object types to UI schemas (editors,
validation, sections).

**Decision:** Rename to `AnimatablePropertyRegistry`
(`06-animation-engine/property-system.md`) and `PropertySchemaRegistry`
(`17-ui/inspector.md`). The Inspector's schema for a given property should
reference the corresponding entry in `AnimatablePropertyRegistry` when
that property is animatable, rather than duplicating the animation
metadata.

---

## ADR-009 — Validation belongs in command handlers, not just the Inspector

**Problem:** Validation rules (e.g. "opacity must be 0–100") were
described as happening in the Inspector's property editors. But commands
can originate from sources other than the Inspector (AI-assisted editing,
plugins, macro replay, scripting) — if validation only lives in Inspector
UI components, those other paths could push invalid values straight into
project state.

**Decision:** Validation is enforced in the command handler (Domain/
Application layer), sourced from the same schema the Inspector uses for
live feedback. The Inspector's inline validation is a UX convenience on
top of this, not the enforcement point.

---

## ADR-010 — Ripple editing and linked items

**Status:** Open — not yet decided, flagged for explicit resolution before
`07-timeline-engine/ripple.md` is implemented.

**Problem:** If a ripple-delete is performed on a video clip that's linked
to audio on another track, does the audio ripple too? This needs an
explicit rule (most NLEs default to "yes, linked items ripple together
unless explicitly unlinked") rather than being discovered as a bug later.

**Recommendation:** default to ripple-follows-links, with an explicit
per-operation override, matching common NLE convention (Premiere-style).

---

## ADR-011 — Layout undo is separate from project undo

**Decision:** Panel/workspace layout changes (docking, resizing, closing
panels) use their own undo stack, separate from the project History
Engine. A user hitting Ctrl+Z immediately after rearranging panels should
not unexpectedly start undoing project edits, or vice versa. Most
professional tools either don't make layout undoable at all, or scope it
separately — this project does the latter, minimally (last layout change
only).

---

## ADR-012 — Export/demux dependency: Mediabunny, not mp4box.js + mp4-muxer

**Problem:** The original plan specified two separate third-party
dependencies for the Export Engine's container layer: `mp4box.js` for
demuxing and `mp4-muxer` for muxing, glued together with raw `VideoDecoder`/
`VideoEncoder` calls.

**Decision:** Use **Mediabunny** for both demuxing and muxing. Confirmed
during Spike A (`docs/13-export/muxer.md`) that `mp4-muxer`'s own package
metadata declares itself deprecated in favor of Mediabunny, which is a single
zero-dependency library covering container read/write plus thin WebCodecs
wrappers (`VideoSampleSink`, `AudioBufferSink`, `CanvasSource`,
`AudioBufferSource`). It was already referenced in `CLAUDE.md`'s risk list as
an `mp4box.js` alternative; the spike confirms it also replaces `mp4-muxer`.

**Why this direction:** one dependency instead of two, actively maintained,
and the author of the library being replaced is the one recommending the
switch.

---

## Open risks carried forward (not yet resolved, tracked for visibility)

These were confirmed as real technical gaps during design review and
still need a decision, ideally informed by the spikes recommended in
`24-roadmap/mvp.md`:

- **GPU memory budget** has no concrete numeric ceiling anywhere in the
  design (Rendering Engine's texture cache, Storage Engine's asset cache).
  Needs an actual number before the LRU eviction logic can be implemented
  meaningfully.
- **Migration failure/rollback** for the project schema is unspecified.
  Given this is a local-only app with no cloud backup by default, a failed
  migration risks real, unrecoverable project loss. Needs a backup-before-
  migrate step at minimum.
- **Crash recovery consistency** — if a crash occurs mid multi-engine
  command (e.g. an Intent that fanned out into several Commands, with only
  some having executed), is the recovered project state guaranteed
  consistent? Not yet designed.
- **Evaluation ordering** for Animation blending (multiple clips on one
  property), Constraints (Follow/Parent), and Expressions all independently
  need dependency-ordered evaluation with cycle detection. These are the
  same underlying problem surfacing three times — solve it once, generically
  (see ADR-005, primitive #3), rather than three times ad hoc.
