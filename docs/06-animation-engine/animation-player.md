# Animation Player

There is no separate "AnimationPlayer" class — evaluation lives directly
on `AnimationEngine` (`evaluateAt`) plus two small collaborators in
`packages/animation/src/evaluator.ts`:

- `SegmentLocator` — finds the two keyframes bounding a tick in a sorted,
  tick-unique keyframe array.
- `evaluateSegment` — turns a located segment + tick + `IPropertyDefinition`
  into a value.

## Incremental evaluation

`SegmentLocator` caches the last resolved keyframe-pair index per
Property Track (`AnimationEngine` holds one `SegmentLocator` per
`PropertyTrackId`). On the next call:

- If the new tick still falls within `[cachedLeft.tick, cachedRight.tick)`,
  it reuses the cached pair — **no binary search**.
- Otherwise it re-runs a binary search (`O(log n)`) and updates the cache.

During normal playback, `evaluateAt` calls arrive with monotonically
increasing ticks one frame apart, almost always landing back in the same
segment — this is the common case the cache optimizes for. Any keyframe
mutation on a track (`addKeyframe`/`moveKeyframe`/`deleteKeyframe`/
`modifyKeyframe`) calls `SegmentLocator.invalidate()` for that track so a
stale cached index is never read after an edit.

This does **not** yet address "only re-compute changed properties" across
a whole Frame State (skipping Layers/properties with no Clip at all,
etc.) — that's the caller's job per `timeline-binding.md`, not something
`AnimationEngine` tracks globally today.

## Binary search

`O(log n)` over the sorted keyframe array, matching `overview.md`'s "100,000
keyframes at 60fps" goal — see `SegmentLocator.binarySearch` (finds the
largest index `i` such that `keyframes[i].tick <= tick`).
