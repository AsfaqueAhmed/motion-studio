# Playback

> Status: Implemented (Phase 9). `packages/audio/src/playback.ts`.

Playback states and transport controls.

## Scope

`AudioTransport` tracks `PlaybackState` (`@motion-studio/shared`, shared
with Timeline's `Playhead` and Core's `Scheduler`) and owns one
`AudioClockSync` (`synchronization.md`):

- `play(currentTick)` — anchors the clock at `(currentTick,
context.currentTime)`, transitions to `Playing`. No-ops if already
  playing.
- `pause()` — `Playing -> Paused`. No-ops otherwise.
- `stop()` — forces `Idle`.
- `seek(tick)` — re-anchors the clock at the new tick without changing
  playback state, matching Timeline's `Playhead.seek()`.
- `onAudioSync(tick)` — wired to `Scheduler.onAudioSync(tick)`; no-ops
  while not `Playing`, otherwise delegates to
  `AudioClockSync.checkDrift`.
- `scheduledTimeForTick(tick)` — the `currentTime` a clip chain
  (`audio-graph.ts`'s `IClipChain.start()`) should be scheduled at to
  sound in sync with `tick`.

Deliberately thin and driver-free, matching `packages/timeline/src/playhead.ts`'s
ownership split: Core's `Scheduler` (Phase 2) owns the actual `raf` loop
and calls `onAudioSync` once per frame; `AudioTransport` never runs its
own clock loop, it only reacts to ticks handed to it.

## Open questions

- No actual clip start/stop scheduling loop exists yet (deciding _which_
  `IClipChain`s to start/stop for a given tick range, based on Timeline
  `TrackItem`s) — that's an Editor Service/Command-layer concern wiring
  Timeline + Audio together, not something `AudioTransport` itself should
  own (it doesn't know about `ITrackItem`/`ITrack` at all, per engine
  ownership boundaries).
