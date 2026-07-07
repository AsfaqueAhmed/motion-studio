import type { ICommand } from "@motion-studio/shared";

/**
 * Undo for panel/dock layout changes — deliberately separate from
 * `HistoryEngine`'s project-edit stacks (ADR-011, docs/DECISIONS.md). Kept
 * minimal per the ADR: only the single most recent layout change is
 * undoable/redoable, not a deep stack.
 */
export class LayoutHistoryStack {
  private last: ICommand | null = null;
  private undone: ICommand | null = null;

  /** Executes `command` and records it as the sole undoable layout change. */
  execute(command: ICommand): void {
    command.execute();
    this.last = command;
    this.undone = null;
  }

  undo(): void {
    if (!this.last) {
      throw new Error("LayoutHistoryStack: nothing to undo");
    }
    this.last.undo();
    this.undone = this.last;
    this.last = null;
  }

  redo(): void {
    if (!this.undone) {
      throw new Error("LayoutHistoryStack: nothing to redo");
    }
    this.undone.redo();
    this.last = this.undone;
    this.undone = null;
  }

  clear(): void {
    this.last = null;
    this.undone = null;
  }

  get canUndo(): boolean {
    return this.last !== null;
  }

  get canRedo(): boolean {
    return this.undone !== null;
  }
}
