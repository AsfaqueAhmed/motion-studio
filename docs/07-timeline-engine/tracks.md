# Tracks

Track types: Video, Audio, Text, Shape, Sticker, Camera(=SceneCamera, see GLOSSARY), Guide, Adjustment, Effect.

## Data shape (`ITrack`, `@motion-studio/shared`)

```ts
interface ITrack {
  id: TrackId;
  type: TrackType; // enum, see enums.ts — same 9 values as the list above
  label: string;
  locked: boolean;
  muted: boolean;
  items: TrackItemId[]; // ids only, never embedded TrackItems
}
```

`items` is maintained exclusively by `TimelineEngine` (`addTrackItem` /
`removeTrackItem` / `moveTrackItem`) — nothing else should push/splice it
directly, or it can drift out of sync with `TrackItemRegistry`.

## Implemented (Phase 5)

- `TrackRegistry` — flat id→`ITrack` store (`@motion-studio/timeline`).
- `TimelineEngine.addTrack(compositionId, track)` / `removeTrack(...)` —
  keep `ITrack.id` in `IComposition.tracks` in sync. `removeTrack` fails
  fast if the track still has items (mirrors `CompositionGraph.removeLayer`
  refusing to remove a Group with children).
- `TimelineEngine.getTrackItemsSorted(trackId)` — the one query path that
  returns a track's items in tick order; used by every edit command and by
  `snapping.ts`'s `getClipEdgeTicks`.

## Open questions

- `Camera` (SceneCamera) track type is defined in the enum but has no
  consuming Layer type yet — deferred to v2 per `PLAN.md`.
- Per-track ordering/z-index across tracks within one Composition (which
  track draws on top) is not yet modeled — needed before Rendering Engine
  (Phase 7) builds its Scene Graph from a Frame State.
