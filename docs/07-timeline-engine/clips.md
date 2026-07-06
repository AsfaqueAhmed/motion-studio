# Clips

TrackItem model: startTime/endTime/offset/speed as references to a Layer, never embedding media.

## Data shape (`ITrackItem`, `@motion-studio/shared`)

```ts
interface ITrackItem {
  id: TrackItemId;
  trackId: TrackId;
  layerId: LayerId; // reference only — the Layer is never embedded/duplicated
  startTick: Tick; // position on the Timeline
  durationTicks: Tick; // startTick + durationTicks = end position on the Timeline
  trimInTick: Tick; // offset into the referenced Layer's own source media
  trimOutTick: Tick; // trimOutTick - trimInTick == durationTicks (playbackRate == 1)
}
```

Deviation from the original `startTime/endTime/offset/speed` shape
sketched in the overview: `speed` is not a TrackItem field — Video/Audio
layers already carry `playbackRate` (Phase 4), so duplicating it here
would let the two drift apart. `endTime` is derived
(`startTick + durationTicks`), not stored, to keep it from going stale
after a trim. `offset` is split into the two source-media bounds
(`trimInTick`/`trimOutTick`) rather than one offset, since both edges need
independent trim per `trimming.md`.

## Implemented (Phase 5)

- `TrackItemRegistry` — flat id→`ITrackItem` store.
- `createTrackItem()` (`timeline-factory.ts`) — defaults `trimInTick` to 0
  and `trimOutTick` to `trimInTick + durationTicks` when omitted.
- `TimelineEngine.addTrackItem` / `removeTrackItem` — the only place
  `ITrack.items` is mutated for a given item; `addTrackItem` rejects
  overlap with any other item already on the same track (adjacent items,
  i.e. `a.end === b.start`, are allowed).
- Commands: `MoveTrackItemCommand`, `TrimTrackItemCommand`,
  `SplitTrackItemCommand`, `DeleteTrackItemCommand`, `RippleDeleteCommand`
  — see `trimming.md`, `splitting.md`, `ripple.md`.

## Open questions

- Linking two TrackItems (e.g. a video's audio) is not modeled — see
  `ripple.md` / ADR-010.
- Nested compositions (a Composition referenced by a TrackItem instead of
  a Layer) — deferred, see `overview.md`.
