# Core Engine — Overview

The Core Engine is the application's kernel. It owns no business logic —
think of it as the operating system Motion Studio runs on top of.

## Owns

- Application lifecycle (start → register services/engines → load
  plugins → open project → ready; and the reverse on shutdown).
- The Engine Registry (register/resolve engines by interface — no engine
  ever does `import ConcreteOtherEngine`).
- The Command Bus, Query Bus, and Event Bus.
- The Worker Manager (owns every worker; workers never talk to each
  other directly, always routed through Core).
- The Scheduler (owns per-frame execution order — see below).
- Configuration loading.
- Centralized error handling/recovery reporting.

## Never does

Render graphics, decode video, generate audio, read project files, run
AI inference. Those are always delegated to the owning engine.

## The Scheduler

The Scheduler owns the fixed per-frame pipeline:

```
Frame Start → Animation Update → Timeline Update → Selection Update
→ Audio Sync → Render Frame → Present Frame
```

This is a **direct call chain**, not an event-bus dispatch — the event
bus is for coarse notifications (selection changed, export finished),
not for driving the 60fps+ hot path. Engines never decide execution
order themselves.

## Engine lifecycle (every engine follows this)

```
UNREGISTERED → REGISTERED → INITIALIZING → READY → PAUSED → STOPPED → DISPOSED
```

## Open items

- Error recovery says "the app never crashes because one engine failed"
  — but the actual fallback behavior per failure type (drop to a
  simpler render backend? disable a plugin? just toast a notification?)
  needs to be concretely specified per failure class, not asserted in
  general. Current placeholder: `EventBus` isolates a throwing listener
  with `console.error` so one bad listener can't take down the bus; this
  is not a real recovery policy.

## Implementation (Phase 2, `packages/core`, 2026-07-06)

- **`Container`** — generic DI container. `register(token, factory)` /
  `resolve(token)`, singleton-cached per token. `Token<T>` is a branded
  `symbol` created via `createToken<T>(description)`. Factories receive
  the container itself, so constructor injection is just "call
  `container.resolve(otherToken)` inside your factory" — no decorators.
- **`ServiceLocator`** — the Engine Registry. `register(engine: IEngine)`
  keyed by `engine.name`; `get<T extends IEngine>(name)` resolves by
  that name (the closest thing to "by interface" without runtime type
  tags, since `I*Engine` types are structurally identical aliases of
  `IEngine` — see `project_phase1_scaffold_decisions` memory). Also
  tracks `EngineLifecycleState` per engine (`packages/core/src/lifecycle.ts`).
  `Paused`/`Stopped` states exist in the enum for spec completeness but
  are never reached yet — no engine's public interface has pause()/stop()
  to drive them.
- **`AppEngine`** — bootstraps `Container`, `ServiceLocator`, `EventBus`,
  `WorkerManager`. `registerEngine()` before `start()`; `start()` calls
  every registered engine's `initialize()` in registration order, then
  every engine's `ready()` in registration order (not interleaved — this
  guarantees no engine's `ready()` runs while another is still
  initializing). `shutdown()` disposes in reverse registration order,
  then terminates all workers. Plugin loading (Phase 14) and project
  opening (Phase 3) are not implemented here — `start()`/`shutdown()` are
  the seam those phases extend, not reimplemented.
- **`EventBus`** — typed pub/sub keyed by `AppEventType` from
  `@motion-studio/shared`. `emit()` is synchronous (fire-and-forget for
  async listeners); `emitAsync()` awaits every listener via
  `Promise.allSettled` so callers can wait on async side effects. No
  wildcard subscription exists — `on()`'s type parameter is always a
  concrete key of `AppEventMap`.
- **`Scheduler`** — the fixed per-frame pipeline
  (`onAnimationUpdate → onTimelineUpdate → onSelectionUpdate → onAudioSync
→ onRenderFrame → onPresentFrame`) is a direct, ordered call chain, not
  routed through `EventBus`, matching the "direct call chain" rule above.
  `play()`/`pause()`/`stop()`/`seek(tick)` drive `PlaybackState`.
  `requestFrame`/`cancelFrame` are injected (default to
  `requestAnimationFrame`/`cancelAnimationFrame`, falling back to
  `setTimeout` when absent, e.g. under Vitest's `node` environment) so
  the scheduler is deterministically testable without a real browser.
  `tickToFrameNumber`/`frameNumberToTick` depend only on tick resolution,
  not fps — ticks are frame subdivisions, so `frameNumber = tick /
tickResolution` regardless of the project's fps.
- **`WorkerManager`** — `WorkerSlot` enum (`rendering`, `export`,
  `ai-inference`, `thumbnail-gen`). Workers are created lazily via a
  registered `WorkerFactory`, never instantiated by Core directly — Core
  doesn't know `new Worker(new URL(...), { type: "module" })` or any
  other bundler-specific construction; the app shell registers the
  factory per slot. `route(from, to, message)` is the sanctioned way to
  forward a message that originated from one worker to another slot,
  so no code path wires two workers to talk to each other directly.
- All five modules have Vitest unit tests co-located as `*.test.ts`
  (`packages/core/src/`) — first real test suite in the repo, since
  Phase 1 packages were empty stubs.
