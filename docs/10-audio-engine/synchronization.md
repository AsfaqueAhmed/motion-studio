# Synchronization

> Status: Implemented (Phase 9). `packages/audio/src/synchronization.ts`, `playback.ts`.

Tick-based sync. RESOLVED: `AudioClockSync` implements the explicit
periodic resync strategy this needed (see below) rather than letting
`AudioContext.currentTime` and Timeline ticks drift apart over long (>2h)
projects.

## Scope

`AudioClockSync`:

- `anchor(tick, contextTime)` — records one `(tick, currentTime)` pair as
  the reference point. Called on `AudioTransport.play()` and on every
  `AudioTransport.seek()`.
- `contextTimeForTick(tick)` — converts any tick to the `currentTime` it
  should sound at, relative to the current anchor:
  `anchorContextTime + ticksToSeconds(tick - anchorTick, fps, tickResolution)`.
  Exact right after an anchor; accumulates floating-point drift the
  further a tick is from it.
- `checkDrift(currentTick, actualContextTime)` — compares the anchor's
  prediction against the real `currentTime`; if the absolute difference
  exceeds `resyncThresholdSeconds` (15ms default), re-anchors at
  `(currentTick, actualContextTime)` and returns `true`. Otherwise no
  state change, returns `false`.

`AudioTransport` (`playback.ts`) wires this to Core's
`Scheduler.onAudioSync(tick)` handler (`packages/core/src/scheduler.ts`,
already reserved in the fixed per-frame pipeline since Phase 2): every
frame, while playing, `onAudioSync` calls `checkDrift` with the real
`context.currentTime`. This is a hard re-anchor, not a gradual pull-in —
gradually correcting would mean transiently changing playback rate to
"catch up," which is audible and its own can of worms. A hard re-anchor
means: audio scheduled from the next tick onward is exactly in sync
again, at the cost of a discontinuity relative to what was scheduled
right before the resync (in practice, imperceptible at drift magnitudes
under ~50ms).

## Open questions

- The 15ms default threshold is a reasonable starting point (perceptible
  audio/video sync error is commonly cited around 20-40ms), not measured
  against this project's actual decode/render pipeline yet — revisit once
  a real `VideoDecoder`/`AudioBuffer` pipeline exists (Phases 12/14) to
  render alongside.
- Resync happens on the tick/currentTime anchor only; it does not
  reschedule already-`start()`-ed `AudioBufferSourceNode`s mid-playback
  (Web Audio doesn't support moving a scheduled start time after the
  fact) — a resync's effect is on _future_ scheduling decisions
  (`scheduledTimeForTick`), not nodes already playing. This matches how
  real NLEs handle drift (correct going forward, don't retroactively
  glitch what's already sounding).
