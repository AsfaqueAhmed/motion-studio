import type { ICommand } from "@motion-studio/shared";
import type { HistoryEngine } from "@motion-studio/history";

/**
 * The canonical entry point every Editor Service dispatches through
 * (`ARCHITECTURE.md` §5: "Typed Command(s) → Command Bus → History Engine
 * → Owning Engine(s)"). Deliberately thin — `HistoryEngine.execute` already
 * does the real work (run the command, push undo, clear redo, emit
 * `CommandExecuted`); this class exists so Editor Services depend on "the
 * Command Bus" as a named seam rather than importing `HistoryEngine`
 * directly, keeping History an implementation detail behind it (and a
 * future seam for cross-cutting concerns like macro recording, per
 * `17-ui/shortcuts.md` — not built yet, ADR still open on Intent vs literal
 * Command replay).
 */
export class CommandBus {
  constructor(private readonly history: HistoryEngine) {}

  execute(command: ICommand): void {
    this.history.execute(command);
  }

  undo(): void {
    this.history.undo();
  }

  redo(): void {
    this.history.redo();
  }

  get canUndo(): boolean {
    return this.history.canUndo;
  }

  get canRedo(): boolean {
    return this.history.canRedo;
  }
}
