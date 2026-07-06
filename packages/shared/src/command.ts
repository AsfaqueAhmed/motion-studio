/**
 * A single, typed, undoable mutation dispatched through the Command Bus.
 * See docs/15-history/overview.md and GLOSSARY.md "Command".
 */
export interface ICommand<TResult = void> {
  readonly id: string;
  readonly label: string;
  execute(): TResult;
  undo(): void;
  redo(): TResult;
}
