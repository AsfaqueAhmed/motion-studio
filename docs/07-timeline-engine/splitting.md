# Splitting

Split/blade operation and preview.

## `SplitTrackItemCommand` (`@motion-studio/timeline/commands`)

```ts
new SplitTrackItemCommand(id, engine, itemId, atTick: Tick, newItemId: TrackItemId)
```

`atTick` must be strictly inside the target item's
`[startTick, startTick + durationTicks)` range — splitting exactly on an
edge is rejected (there'd be nothing to split).

On execute:

1. The original item is shortened in place: `durationTicks` becomes
   `atTick - startTick`, and `trimOutTick` is pulled back to
   `trimInTick + newDuration` so it still reflects the (now shorter)
   amount of source media it plays.
2. A new item (`newItemId`, caller-supplied — ids are never generated
   inside the engine, matching `@motion-studio/layer`'s factory
   convention) is created for the remainder: same `trackId`/`layerId`,
   `startTick = atTick`, and `trimInTick` picking up exactly where the
   first half's `trimOutTick` left off, so playback across the cut is
   seamless.

The two resulting items are exactly adjacent
(`first.startTick + first.durationTicks === second.startTick`), which
`TimelineEngine`'s overlap check explicitly allows.

`undo()` removes the new item and restores the original's
`durationTicks`/`trimOutTick` from a snapshot taken before the split.

## Open questions

- Splitting a selection spanning multiple tracks (e.g. linked video+audio)
  at the same tick is not implemented — see `ripple.md` / ADR-010 for the
  same "linked items" gap.
