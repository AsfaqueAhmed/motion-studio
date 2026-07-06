# Trimming

Trim left/right, ripple trim, slip, slide.

## `TrimTrackItemCommand` (`@motion-studio/timeline/commands`)

```ts
new TrimTrackItemCommand(id, engine, itemId, edge: "in" | "out", newTimelineTick: Tick)
```

`newTimelineTick` is the new _absolute Timeline position_ of the edge
being dragged (not a duration or delta) — the natural value a
drag-to-trim UI already has mid-gesture.

`TimelineEngine.trimTrackItem` does the actual math:

- **`edge: "in"`** (drag the left edge): `startTick` moves to
  `newTimelineTick`; `durationTicks` shrinks by the same delta;
  `trimInTick` advances by that delta (the clip starts later into its
  source media). `trimOutTick` is untouched.
- **`edge: "out"`** (drag the right edge): `durationTicks` and
  `trimOutTick` both change by `newTimelineTick - (startTick + durationTicks)`.
  `startTick`/`trimInTick` are untouched.

Validated before any mutation: resulting `durationTicks > 0`,
`0 <= trimInTick < trimOutTick`, and no overlap with another item on the
same track (via `TimelineEngine.overlaps`). `undo()` restores an exact
snapshot of the four fields rather than re-deriving them, so repeated
trim/undo/trim cycles can't accumulate rounding drift.

## Not implemented (Phase 5 scope)

- **Ripple trim** (trimming one item shifts everything after it, like
  `RippleDeleteCommand` does for delete) — not built; today's trim only
  ever affects the single targeted item.
- **Slip** (shift `trimInTick`/`trimOutTick` together without changing
  `startTick`/`durationTicks` — i.e. change _what_ plays, not _when_) and
  **slide** (move one item while extending/shrinking its neighbors to
  absorb the change) are not implemented. Both are additive — no
  `ITrackItem` shape change is anticipated to add them later.
