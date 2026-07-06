# Playback

Playhead, playback states, integer-tick time representation (no floating point).

## `Playhead` (`@motion-studio/timeline`)

```ts
class Playhead {
  constructor(durationTicks: Tick, tickResolution?: number);
  get currentTick(): Tick;
  get playbackState(): PlaybackState; // Idle | Playing | Paused | Seeking (enum, shared)
  get loopPoints(): { inTick: Tick; outTick: Tick } | null;
  setDuration(durationTicks: Tick): void;
  setLoop(loop: { inTick: Tick; outTick: Tick } | null): void;
  play(): void;
  pause(): void;
  stop(): void; // -> Idle, tick reset to 0
  seek(tick: Tick): void; // clamped to [0, durationTicks)
  frameStep(direction: 1 | -1): void; // exactly one tickResolution's worth of ticks
  advance(deltaTicks: Tick): void; // no-op unless Playing
}
```

## Design decision: no second raf loop

Core's `Scheduler` (Phase 2, `packages/core/src/scheduler.ts`) already owns
the raf-driven wall-clock→tick conversion and exposes exactly this same
`play/pause/stop/seek` surface generically. Rather than duplicate that
timing logic inside the Timeline Engine, `Playhead` is a pure tick-domain
object: it holds Composition-aware state (duration bounds, loop points,
frame-stepping) and exposes `advance(deltaTicks)` for an external driver
to call every frame. The intended wiring (built when the Editor Service
lands) is: `Scheduler`'s `onTimelineUpdate(tick)` frame-pipeline hook
computes a tick delta and calls `Playhead.advance()`. This keeps "how time
advances in real time" (Core) and "what advancing means for this
Composition" (Timeline) as two separate concerns, per the engine ownership
table in `CLAUDE.md`.

## Looping

`advance()` wraps forward-only: once `currentTick` would exceed
`loop.outTick`, it re-enters at `loop.inTick` plus the overshoot modulo the
loop length. Without a loop set, `advance()` clamps to
`durationTicks - 1` and transitions to `Idle` (playback naturally stops at
the end of the Composition).

## Open questions

- Reverse playback / scrubbing backward while Playing is not implemented —
  `advance()` assumes non-negative `deltaTicks`.
- Audio clock resync (`AudioContext.currentTime` vs. the tick clock) is
  still an open risk per `CLAUDE.md` — not addressed here, deferred to
  Phase 9 (Audio Engine).
