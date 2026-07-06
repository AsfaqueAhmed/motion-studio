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
  general.
