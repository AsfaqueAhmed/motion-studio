# Undo

> Status: Implemented (Phase 11, 2026-07-07). See `packages/history/src/history-engine.ts`.

`HistoryEngine.undo()` pops the top of the undo stack, calls
`command.undo()`, then pushes that same command onto the redo stack.
Throws `"HistoryEngine: nothing to undo"` on an empty stack — callers
(future Editor Service / UI) are expected to check `canUndo` before
calling, same as `getters`-then-`throw` style used elsewhere in this
codebase (e.g. `MoveTrackItemCommand.undo()` throwing on "cannot undo
before execute()").

## Workspace/panel-layout undo — resolved (ADR-011)

Layout undo does **not** share this stack. It's a completely separate
class, `LayoutHistoryStack` (`src/layout-history.ts`), instantiated
independently from `HistoryEngine`. It's deliberately minimal per the
ADR: one undo slot, one redo slot — only the single most recent layout
change is undoable, not a deep history of layout changes. A second
`execute()` call overwrites the tracked command with no way back to
anything older.

## Max depth

`HistoryEngine`'s undo stack is bounded by `maxDepth` (constructor
option, default 100). Once exceeded, the oldest entry is silently
dropped (`Array.shift()`) — there is no way to undo past that point,
which is the intended, documented behavior of a bounded history, not a
bug.
