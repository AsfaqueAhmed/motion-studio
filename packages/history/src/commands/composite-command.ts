import type { ICommand } from "@motion-studio/shared";

/**
 * Bundles several Commands into one undo step. Used when an Intent fans out
 * into multiple mutations that must undo/redo atomically (see
 * docs/15-history/overview.md "Macro recording granularity" — this bundles
 * the literal Command sequence, not a re-runnable Intent).
 */
export class CompositeCommand implements ICommand {
  constructor(
    readonly id: string,
    readonly label: string,
    private readonly commands: readonly ICommand[],
  ) {}

  execute(): void {
    for (const command of this.commands) {
      command.execute();
    }
  }

  undo(): void {
    for (const command of [...this.commands].reverse()) {
      command.undo();
    }
  }

  redo(): void {
    for (const command of this.commands) {
      command.redo();
    }
  }
}
