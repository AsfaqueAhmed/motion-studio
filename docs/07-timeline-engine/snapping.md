# Snapping

Snap targets: playhead, clip edges, markers, grid, composition end, guides.

## `snapping.ts` (`@motion-studio/timeline`)

Snapping is a pure calculation, not a Command — it's used mid-drag to
suggest a position; the actual mutation still commits through
`MoveTrackItemCommand`/`TrimTrackItemCommand` once the user releases.

```ts
snapTick(candidateTick: Tick, targets: readonly Tick[], thresholdTicks: Tick): Tick
getClipEdgeTicks(engine: TimelineEngine, trackId: TrackId, excludeItemId?: TrackItemId): Tick[]
nearestGridTick(candidateTick: Tick, gridTicks: Tick): Tick
```

`snapTick` is the one generic primitive: given a candidate tick and a flat
list of target ticks, return the nearest target within `thresholdTicks`,
or the candidate unchanged if none qualify. Callers assemble whichever
target list applies to "playhead, other clip edges, grid" by combining:

- the current `Playhead.currentTick` (single-element target list),
- `getClipEdgeTicks(engine, trackId, draggedItemId)` — every other item's
  start/end tick on the same track (excludes the item being dragged so it
  can't snap to itself),
- `nearestGridTick` for the grid case, which doesn't need a target list at
  all since any tick has a well-defined nearest grid line.

## Not implemented

- Markers, guides, and "composition end" as explicit snap targets — the
  underlying data model for markers/guides doesn't exist yet. Adding them
  later is additive: just more entries in the `targets` array passed to
  `snapTick`, no change to `snapTick` itself.
