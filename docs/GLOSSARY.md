# Glossary

Canonical definitions. Where earlier design drafts used a term
ambiguously or inconsistently, this is the tiebreaker — use these meanings
in code, comments, and any new documentation. See `DECISIONS.md` for the
reasoning behind each resolution.

---

**Layer** — The canonical unit of "what" something is (image, video,
text, shape, audio, group), independent of when it appears (Timeline's
job) or where it sits in the visual hierarchy at render time (Rendering
Engine's job). One Layer can be referenced by multiple TrackItems on the
Timeline without duplication. Previously called `Entity` (Timeline
drafts) or `Scene Graph Object` (early Layers Panel drafts) — both
retired in favor of this one term. Defined in `08-layer-engine/`.

**Composition Graph** — The _persistent_, project-level structural
hierarchy of Layers: groups, nesting, parent-child transform
relationships. This is real project data, saved with the project.
Visualized by the Layers Panel. Defined in `08-layer-engine/group-layer.md`.
Not to be confused with **Scene Graph** (below).

**Scene Graph** — An _ephemeral_, per-frame structure the Rendering
Engine builds from a Frame State and discards immediately after that
frame is drawn. Exists only transiently, never persisted. Defined in
`05-rendering-engine/scene-graph.md`. Built _from_ an evaluation of the
Composition Graph at a given tick — document this relationship wherever
both terms appear together.

**Frame State** — The one immutable, deterministic snapshot of everything
visible/audible/active at a given tick, produced by evaluating Timeline +
Animation + Layer data together. Consumed identically by the Rendering
Engine (live preview) and the Export Engine (offline render), which is
what guarantees preview and export produce identical output. See
`ARCHITECTURE.md` §4.

**Render Graph** — The node-based effect/blend/mask pipeline (e.g. Image
→ Blur → Shadow → Mask → Blend → Output) that the Rendering Engine
executes against the GPU backend for a given Scene Graph. Defined in
`05-rendering-engine/compositor.md`.

**ViewportCamera** — The _editing_ camera: pan/zoom/rotation of the
canvas viewport while working. Pure UI/ephemeral state, never part of the
rendered project output. Lives in the Canvas System (`17-ui/`). Previously
just called "Camera" in the Canvas System drafts — renamed to disambiguate
from `SceneCamera`.

**SceneCamera** — An _in-scene_ camera entity: a Layer type that can be
keyframed and rendered as part of the actual composition (e.g. a virtual
camera move as a visual effect), referenced by a Camera Track. A future
capability, defined as a Layer type in `08-layer-engine/` and a track
type in `07-timeline-engine/tracks.md`. Previously just called "Camera"
in Timeline drafts — renamed to disambiguate from `ViewportCamera`.

**AnimatablePropertyRegistry** — The Animation Engine's registry of
properties that can be keyframed: each entry defines a data type, default
value, interpolator, and validation rule. Lets plugins register new
animatable properties (e.g. a Particle effect's `Emission Rate`) without
modifying the Animation Engine itself. Defined in
`06-animation-engine/property-system.md`. Previously ambiguously called
just "Property Registry."

**PropertySchemaRegistry** — The Inspector's registry mapping object
_types_ to UI schemas: which sections/editors/validators/visibility rules
apply to an Image vs. a Text layer vs. an Audio clip. Defined in
`17-ui/inspector.md`. Where a property in this registry is also
animatable, its schema entry should reference the corresponding entry in
`AnimatablePropertyRegistry` rather than duplicating interpolation
metadata. Previously ambiguously called just "Property Registry" — same
name, different registry, now disambiguated.

**Capability Registry** — A registry pattern used in multiple engines
(AI Engine, Tool System) where features/tools declare _what capability
they need_ (e.g. `TextToSpeech`, `Selection`) rather than depending on a
specific implementation (a specific model, a specific tool). Lets
implementations be swapped or made hardware-conditional without touching
calling code. This pattern is intentionally reused, not a naming
collision — see `11-ai/provider-system.md` and `17-ui/toolbar.md`.

**Intent** — What the user wants ("delete the selection"), expressed
independent of how it's achieved. Resolved by an Editor Service into one
or more typed Commands. Canonical definition in `17-ui/panels.md`.

**Command** — A single, typed, undoable mutation (e.g.
`DeleteLayerCommand`), dispatched through the Command Bus, with
`execute()`/`undo()`/`redo()`. Multiple Commands may result from a single
Intent. Canonical definition in `15-history/command-pattern.md` and
`17-ui/shortcuts.md`.

**Tick** — The atomic, integer unit of time used internally by the
Timeline and Animation engines (never floating-point seconds), to
guarantee deterministic playback and exact frame boundaries with no
floating-point drift. E.g. 1 second at 30fps = 30 frames = 900 ticks
(project-configurable tick resolution). Defined in
`07-timeline-engine/playback.md`.

**Asset** — Anything imported and reusable: image, video, audio, font,
LUT, template, AI-generated media. Owned entirely by the single asset
management engine in `14-assets/` — see `DECISIONS.md` ADR-002 for why
this is not split between an "engine" and a "panel."

**VFS (Virtual File System)** — The abstraction layer between engines and
actual browser storage (IndexedDB/OPFS). Engines talk to the VFS, never
directly to IndexedDB or OPFS, so storage backends (e.g. future cloud
sync) can be swapped without touching engine code. Defined in
`12-storage/overview.md`.
