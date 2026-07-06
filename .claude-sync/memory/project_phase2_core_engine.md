---
name: project-phase2-core-engine
description: Design choices made implementing packages/core (Phase 2) where PLAN.md/docs left API shapes unspecified
metadata: 
  node_type: memory
  type: project
  originSessionId: 5e20f2db-5d34-42c6-ad00-eacb0ac5977b
---

Phase 2 (`packages/core`) implemented `Container` (generic DI, `Token<T>`
branded symbols, singleton-cached `register`/`resolve`), `ServiceLocator`
(Engine Registry keyed by `engine.name`, tracks `EngineLifecycleState`),
`AppEngine` (bootstrap: `registerEngine()` then `start()` runs every
engine's `initialize()` before any `ready()`, `shutdown()` disposes in
reverse order + terminates workers), `EventBus` (typed pub/sub over
`AppEventMap`, `emit()` sync + `emitAsync()` via `Promise.allSettled`),
`Scheduler` (fixed frame pipeline as a direct call chain per
`docs/04-core/core-overview.md`, injectable `requestFrame`/`cancelFrame`
so it's testable under Vitest's `node` environment without a real
browser), and `WorkerManager` (`WorkerSlot` enum: rendering/export/
ai-inference/thumbnail-gen; workers created lazily via an app-registered
factory, never via `new Worker(...)` inside Core itself, since that's
bundler-specific).

Decisions made without explicit spec backing:

- **Engine resolution "by interface"** (core-overview.md's phrasing) is
  actually by `engine.name` string — `I*Engine` types are structurally
  identical `IEngine` aliases with no runtime tag, so name is the only
  real registry key available (see [[project_phase1_scaffold_decisions]]).
- **`EngineLifecycleState`** enum includes `Paused`/`Stopped` for spec
  completeness (docs/04-core/core-overview.md's full diagram) but the
  registry never transitions an engine into those states — no engine's
  `IEngine` surface has pause()/stop() yet. Don't wire these up
  speculatively; extend when a real engine needs them.
- **`tickToFrameNumber`** depends only on tick resolution, not fps —
  ticks are frame subdivisions (`ticksPerSecond = fps * tickResolution`),
  so frame number is `tick / tickResolution` regardless of project fps.
  This lives in `packages/core/src/scheduler.ts`, not `packages/shared`,
  since it's scheduler/playback-specific rather than generic tick math.
- **Plugin loading and project-opening** (mentioned in core-overview.md's
  "Application lifecycle") are explicitly NOT implemented in `AppEngine`
  — `start()`/`shutdown()` are documented as the seam Phase 14 (Plugin)
  and Phase 3 (Storage) extend, not reimplemented now.

**Why this matters:** the next session picking up Phase 3+ (or revisiting
Core) shouldn't re-derive these from scratch. See
[[project_phase1_scaffold_decisions]] for the npm-scope/testing
conventions this phase followed, and [[feedback_phase_branching]] for why
this work is on a `phase-2-core-engine` branch rather than `main`.
