# Command Pattern

> Status: Implemented (Phase 11, 2026-07-07).

Every mutation is an immutable Command with `execute()`/`undo()`/`redo()`.
Commands issued via the Command Bus, never engines mutating state
directly. `ICommand` lives in `@motion-studio/shared` (`command.ts`):

```ts
interface ICommand<TResult = void> {
  readonly id: string;
  readonly label: string;
  execute(): TResult;
  undo(): void;
  redo(): TResult;
}
```

`label` is this project's "description" field. Every real command in the
codebase (Timeline's `MoveTrackItemCommand`/`TrimTrackItemCommand`/
`SplitTrackItemCommand`/`DeleteTrackItemCommand`/`RippleDeleteCommand`,
Animation's `AddKeyframeCommand`/`MoveKeyframeCommand`/
`DeleteKeyframeCommand`/`ModifyKeyframeCommand`) uses the default
`TResult = void` — `HistoryEngine` only ever calls `execute()`/`undo()`/
`redo()` for side effects and never reads a return value, so it types
against plain `ICommand`, not the generic form.

## `redo()` vs `execute()`

Some commands implement `redo()` as literally `return this.execute()`
(e.g. `AddKeyframeCommand`) when redoing is identical to the original
mutation. Others (e.g. `MoveTrackItemCommand`) need `redo()` to differ
from `execute()` because `execute()` captures "previous state" as a side
effect for `undo()` to use later — redoing must not re-capture that
state. `HistoryEngine` treats both as opaque; it never assumes `redo()`
calls `execute()` internally.

## `CompositeCommand`

`packages/history/src/commands/composite-command.ts` wraps
`readonly ICommand[]` as one `ICommand`: `execute()`/`redo()` iterate
forward, `undo()` iterates in reverse. Used when an Intent fans out into
several Commands that must appear as a single undo step.

## Open questions

See `overview.md` "Open decisions" — macro recording granularity and
crash consistency remain undecided.
