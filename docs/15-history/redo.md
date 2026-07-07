# Redo

> Status: Implemented (Phase 11, 2026-07-07). See `packages/history/src/history-engine.ts`.

`HistoryEngine.redo()` pops the top of the redo stack, calls
`command.redo()`, then pushes that command back onto the undo stack
(re-applying `maxDepth` trimming, same as a fresh `execute()`). Throws
`"HistoryEngine: nothing to redo"` on an empty stack.

## Invalidation on new command after undo

Calling `execute(command)` after one or more `undo()` calls clears the
entire redo stack (`this.redoStack.length = 0`) — standard undo/redo
semantics, matching every mainstream editor. There is no branching
history; the discarded redo entries are gone, not preserved on a side
branch.

`LayoutHistoryStack.execute()` does the same thing at its one-slot scale:
a new layout change after an undo discards the single tracked redo slot.
