# Ripple

Ripple delete/insert. OPEN DECISION: ripple + linked items interaction -- see DECISIONS.md.

## `RippleDeleteCommand` (`@motion-studio/timeline/commands`)

```ts
new RippleDeleteCommand(id, engine, itemId);
```

Deletes `itemId` and shifts every other item on **the same track** whose
`startTick` is after the deleted item's `startTick` backward by the
deleted item's `durationTicks`, closing the gap. Items before the deleted
item are untouched. Shifting uses
`TimelineEngine.shiftTrackItemStart`, which intentionally skips the
overlap check `moveTrackItem` does — a uniform backward shift of
already-non-overlapping later items can't introduce a new overlap, so
re-validating on every shifted item would be pure overhead.

`undo()` re-adds the deleted item and restores every shifted item's exact
previous `startTick` (recorded per-item during `execute()`, not
recomputed), so it's exact even if `durationTicks` were to change between
execute and undo in some future extension.

## ADR-010 status: still open, ripple here is single-track only

Per `DECISIONS.md` ADR-010, this is still an **open** decision, not
resolved by this implementation. `ITrackItem` has no "linked to" field
today, so there is no way to express "this audio item is linked to that
video item." `RippleDeleteCommand` therefore only ripples items on the
`trackId` of the deleted item itself — it does **not** implement the
recommended default (ripple-follows-links across tracks) because the data
model doesn't yet have anything to follow.

**Before implementing cross-track ripple:** add a linking concept to
`ITrackItem` (or a separate link table) and resolve ADR-010 explicitly,
per `CLAUDE.md`'s "Open ADRs" list.

## Not implemented

- **Ripple insert** (inserting an item pushes everything after it forward)
  is not built — only ripple delete.
