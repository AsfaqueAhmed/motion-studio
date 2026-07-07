# Keyframes

`IKeyframe` (`@motion-studio/shared` `animation.ts`): `{ tick, value,
interpolation, bezierControlPoints? }`. Time is always a `Tick` — never a
float. `bezierControlPoints` (a CSS-style `{x1,y1,x2,y2}` cubic-bezier)
only applies when `interpolation` is `InterpolationType.Bezier`.

Keyframes live embedded in their `IPropertyTrack.keyframes` array, kept
tick-sorted and tick-unique by `AnimationEngine` — there is no separate
`KeyframeId`; a keyframe's identity within a track is its tick (mirrors
how `ITrackItem`s enforce a per-track invariant rather than needing extra
identity, see `../07-timeline-engine/overview.md`).

## Operations (all via Commands, `packages/animation/src/commands/`)

- `AddKeyframeCommand` — `AnimationEngine.addKeyframe`, rejects a
  duplicate tick and a value that fails the property's registered
  validator.
- `MoveKeyframeCommand` — `AnimationEngine.moveKeyframe(trackId, fromTick,
toTick)`, re-sorts the track and rejects landing on an existing tick.
- `DeleteKeyframeCommand` — snapshots the removed keyframe so undo can
  re-add it identically (mirrors `DeleteTrackItemCommand`).
- `ModifyKeyframeCommand` — patches `value`/`interpolation`/
  `bezierControlPoints` in place; snapshots the previous fields via object
  destructuring (`{ tick: _tick, ...before }`) rather than assigning
  `undefined` explicitly, since the repo's `exactOptionalPropertyTypes`
  setting treats an explicit `undefined` differently from an absent key.

Every mutation invalidates that track's cached `SegmentLocator` segment
(see `animation-player.md`) so evaluation never reads a stale cached
index.

## Open questions

- No keyframe-level "selected" or "easing preview" UI state modeled yet —
  that's Phase 15 (Editor UI) Inspector concern, not this engine's.
- Multi-select keyframe operations (drag a box of keyframes) are not
  modeled — today's Commands operate on one keyframe at a time.
