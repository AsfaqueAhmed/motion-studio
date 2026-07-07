# History Engine — Overview

> Status: Implemented (Phase 11, 2026-07-07). See `packages/history/src`.

## Model

Command pattern, not snapshots. Every mutation is an immutable Command
object with `execute()` / `undo()` / `redo()`, dispatched through the
Command Bus (`../02-system-architecture/event-system.md`). The History
Engine maintains the undo/redo stacks and never needs to know what a
given command actually does internally — it just calls `undo()`/`redo()`
on it.

`ICommand` (`execute() / undo() / redo() / id / label`) already lived in
`@motion-studio/shared` before this phase — Timeline (Phase 5) and
Animation (Phase 6) both built real `ICommand` implementations ahead of
History existing, the same latitude Phase 4 had with no Command Bus wired
up yet. This phase adds the engine that actually owns the stacks; no
`ICommand` shape changes were needed.

## `HistoryEngine`

Two stacks (`undoStack`, `redoStack`), `execute(command)` pushes onto
undo and clears redo. `maxDepth` (default 100, constructor option) drops
the oldest undo entry once exceeded. Emits `CommandExecuted` /
`CommandUndone` / `CommandRedone` through an injected `IHistoryEventSink`
— same DI shape as Export's `IExportEventSink`, so the engine never
depends on the concrete `EventBus` class.

## `CompositeCommand`

Bundles several `ICommand`s into one undo step (`src/commands/composite-command.ts`).
`execute()`/`redo()` run sub-commands forward, `undo()` runs them in
reverse. Resolves the "macro recording granularity" question below in
favor of storing the literal Command sequence, not the originating
Intent — simpler, but replay is exact-state-only (see open question).

## Never does

Render, decode media, mutate project state directly (it only calls
methods on Command objects, which do the actual mutation).

## Resolved decisions

- **Layout undo vs. project undo.** Implemented as `LayoutHistoryStack`
  (`src/layout-history.ts`) — a wholly separate class/instance from
  `HistoryEngine`, per ADR-011. Deliberately minimal: it tracks only the
  single most recent layout change (one undo slot, one redo slot), not a
  deep stack.
- **History cleared on project load.** `HistoryEngine.clear()` exists and
  is unit-tested, but nothing in this package subscribes to
  `ProjectLoaded` itself — no engine in this codebase self-subscribes to
  another engine's events yet (checked: zero `.on(` calls across
  `packages/*/src`). Wiring `clear()` to `ProjectLoaded` is left to the
  future Editor Service / Intent layer, same gap as Rendering's Render
  Graph not being wired into any backend yet.

## Open decisions

- **Macro recording granularity.** If the Intent Layer fans one user
  action into several Commands, does a recorded macro store the
  high-level Intent (robust to minor differences in project state on
  replay) or the literal sequence of Commands it happened to produce
  once (exact but brittle)? `CompositeCommand` implements the literal-
  sequence option for the "one undo step" case; a separate macro-
  _recording_ feature (for `../17-ui/shortcuts.md`) still needs this
  decision made explicitly before it's built.
- **Crash consistency.** If a crash happens mid multi-command operation
  (some commands from one Intent executed, others not), is recovered
  state guaranteed consistent? Not yet designed — real risk given this
  app has no cloud backup by default. `CompositeCommand` doesn't help
  here: a crash between two of its sub-commands' `execute()` calls still
  leaves partial state, since it's a plain in-memory wrapper, not a
  transaction with rollback-on-failure.
