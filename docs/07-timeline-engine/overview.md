# Timeline Engine — Overview

Describes _when_ Layers appear and how they're arranged over time. Does
not render, decode media, or animate. Only manages temporal
relationships.

## Data model

```
Project → Composition → Track → TrackItem → Layer (by reference/ID)
```

A `TrackItem` represents _when_ something appears (startTime, endTime,
offset, speed) and references a `Layer` (see `../GLOSSARY.md`) by ID —
it never embeds the actual media or object data. One Layer can be
referenced by many TrackItems with no duplication (e.g. one logo image
appearing in an intro, main, and outro clip).

Time is represented as integer **ticks**, never floating-point seconds —
this is non-negotiable for deterministic playback and exact snapping.

## The Frame Evaluation Pipeline (Timeline Evaluation Graph)

Each frame, Timeline + Animation + Selection cooperate to produce one
immutable Frame State (see `../GLOSSARY.md` and `../ARCHITECTURE.md` §4):

```
Playhead → Visible Tracks → Active TrackItems → Resolve Links
→ Resolve Speed → Resolve Effects → Resolve Masks → Frame State → Renderer
```

The Renderer never queries "what clips overlap right now" — it only
ever consumes the Frame State this pipeline produces.

## Open decisions

- **Ripple + Linked Items:** what happens to linked audio when you
  ripple-delete video on another track? Not yet decided in general —
  see `../DECISIONS.md` ADR-010 for the recommended default (ripple
  follows links, with an explicit per-operation override).
- **Nested compositions** (a Composition referenced as a Layer by
  another Composition's TrackItem) need cycle detection and a defined
  rule for how nested Frame State evaluation composes — deferred until
  nesting is actually built, but the Layer/TrackItem model shouldn't
  need to change shape to support it later. Worth double-checking this
  before locking the schema.

## Performance goals

10,000+ timeline items, 60fps scrolling, O(log n) item lookup,
visible-region virtualization only (never render/evaluate off-screen
items).

## Implementation notes (Phase 5, `@motion-studio/timeline`)

- Three flat, bespoke registries (`CompositionRegistry`, `TrackRegistry`,
  `TrackItemRegistry`), mirroring `@motion-studio/layer`'s `LayerRegistry`
  shape — dumb id→entity maps with no cross-entity awareness.
- `TimelineEngine` is the single coordinator on top of those registries: it
  is the only thing allowed to mutate `IComposition.tracks` / `ITrack.items`
  after creation (same role `CompositionGraph` plays for Layers), and it
  enforces the one hard invariant — **no two TrackItems on the same Track
  may overlap** — in `addTrackItem`, `moveTrackItem`, and `trimTrackItem`.
  This did not reuse the generic `Hierarchy<TId>` primitive (ADR-005 #2):
  Composition→Track→TrackItem is a heterogeneous 3-level containment, not a
  same-type parent/child recursion, so a bespoke coordinator was the better
  fit than forcing a fourth graph shape.
- Playback (`Playhead`) deliberately does **not** run its own raf loop.
  Core's `Scheduler` (Phase 2) already owns wall-clock→tick timing;
  `Playhead.advance(deltaTicks)` is meant to be driven by that Scheduler's
  `onTimelineUpdate` handler (wiring happens when the Editor Service is
  built). `Playhead` only knows Ticks, never wall-clock time — see
  `playback.md`.
- The performance goals above (10,000+ items, O(log n) lookup) are not yet
  met: `TimelineEngine.getTrackItemsSorted` and `overlaps` are O(n log n) /
  O(n) per call today. Fine at MVP item counts; revisit with an interval
  tree or sorted index before the 10k-item goal is load-bearing.
- Nested compositions are still out of scope — `ITrackItem.layerId` only
  ever points at an `ILayer`. No shape changes were needed to leave this
  path open.
