# History Engine — Overview

**Finally specified here** after being referenced-but-never-designed
across multiple earlier drafts (Timeline Engine, Editor Core both
listed it as a dependency without it having its own spec).

## Model

Command pattern, not snapshots. Every mutation is an immutable Command
object with `execute()` / `undo()` / `redo()`, dispatched through the
Command Bus (`../02-system-architecture/event-system.md`). The History
Engine maintains the undo/redo stacks and never needs to know what a
given command actually does internally — it just calls `undo()`/`redo()`
on it.

## Never does

Render, decode media, mutate project state directly (it only calls
methods on Command objects, which do the actual mutation).

## Open decisions

- **Layout undo vs. project undo.** Panel/workspace layout changes
  (docking, resizing, closing panels — see `../17-ui/docking.md`) should
  use a **separate** undo stack from project edits. A user hitting
  Ctrl+Z right after rearranging panels shouldn't unexpectedly start
  undoing a clip deletion, or vice versa. See `../DECISIONS.md` ADR-011.
- **Macro recording granularity.** If the Intent Layer fans one user
  action into several Commands, does a recorded macro store the
  high-level Intent (robust to minor differences in project state on
  replay) or the literal sequence of Commands it happened to produce
  once (exact but brittle)? Needs an explicit decision before
  `../17-ui/shortcuts.md`'s macro feature is implemented.
- **Crash consistency.** If a crash happens mid multi-command operation
  (some commands from one Intent executed, others not), is recovered
  state guaranteed consistent? Not yet designed — real risk given this
  app has no cloud backup by default.
