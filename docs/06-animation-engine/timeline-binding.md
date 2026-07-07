# Timeline Binding

`AnimationEngine.evaluateAt(layerId, propertyKey, tick)` is the entry
point a future Frame State builder calls once per visible Layer property,
per tick — it does not read the Timeline itself (Animation Engine "never
touches ... rendering, storage" per CLAUDE.md's ownership table, and
Timeline isn't listed as something it reads either). The caller (not yet
built — there is no Editor Service/Frame State builder as of Phase 6) is
expected to:

1. Ask the Timeline Engine which Layers are active at `tick` (via
   `TimelineEngine.getTrackItemsSorted` + the Composition's tracks).
2. For each active Layer, call `AnimationEngine.evaluateAt(layerId,
propertyKey, tick)` for each animatable property.
3. Fall back to the Layer's own static field value when `evaluateAt`
   returns `undefined` (no Clip on that Layer, or no track for that
   property) — this is why `evaluateAt` returns `undefined` rather than
   throwing for the "not animated" case.

This mirrors `docs/07-timeline-engine/playback.md`'s note that `Playhead`
doesn't run its own loop — the wiring between Timeline's tick and
Animation's evaluation is Editor Service work (not yet built), not
something either engine does to the other directly.

## Open question

No caching/memoization exists yet at the Frame State level (across
Layers) — only within a single Property Track's own evaluation
(`SegmentLocator`, see `animation-player.md`). Whether a whole-Frame-State
"only re-evaluate Layers whose Clip changed since last tick" cache is
worth adding is a Rendering Engine (Phase 7) / Frame State builder
concern, not decided here.
