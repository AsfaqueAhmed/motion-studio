import type { AppEventMap, AppEventType, ICommand, IHistoryEngine } from "@motion-studio/shared";

const DEFAULT_MAX_DEPTH = 100;

/** Matches Export's `IExportEventSink` DI shape — engine depends on the interface, not `EventBus` itself. */
export interface IHistoryEventSink {
  emit<T extends AppEventType>(type: T, payload: AppEventMap[T]): void;
}

export interface IHistoryEngineOptions {
  /** Oldest undo entries are dropped once this is exceeded. See PLAN.md Phase 11. */
  readonly maxDepth?: number;
  readonly events?: IHistoryEventSink;
}

/**
 * Project-edit undo/redo stack. Command pattern per docs/15-history/overview.md:
 * never mutates project state itself, only calls execute()/undo()/redo() on the
 * Commands it's handed. Layout undo is a deliberately separate instance — see
 * `LayoutHistoryStack` and ADR-011 — never shares stacks with this engine.
 */
export class HistoryEngine implements IHistoryEngine {
  readonly name = "History";

  private readonly undoStack: ICommand[] = [];
  private readonly redoStack: ICommand[] = [];
  private readonly maxDepth: number;
  private readonly events: IHistoryEventSink | undefined;

  constructor(options: IHistoryEngineOptions = {}) {
    this.maxDepth = options.maxDepth ?? DEFAULT_MAX_DEPTH;
    this.events = options.events;
  }

  initialize(): void {}

  ready(): void {}

  dispose(): void {
    this.clear();
  }

  /** Executes `command` and pushes it onto the undo stack, clearing any redo history. */
  execute(command: ICommand): void {
    command.execute();
    this.undoStack.push(command);
    if (this.undoStack.length > this.maxDepth) {
      this.undoStack.shift();
    }
    this.redoStack.length = 0;
    this.events?.emit("CommandExecuted", { commandId: command.id });
  }

  undo(): void {
    const command = this.undoStack.pop();
    if (!command) {
      throw new Error("HistoryEngine: nothing to undo");
    }
    command.undo();
    this.redoStack.push(command);
    this.events?.emit("CommandUndone", { commandId: command.id });
  }

  redo(): void {
    const command = this.redoStack.pop();
    if (!command) {
      throw new Error("HistoryEngine: nothing to redo");
    }
    command.redo();
    this.undoStack.push(command);
    if (this.undoStack.length > this.maxDepth) {
      this.undoStack.shift();
    }
    this.events?.emit("CommandRedone", { commandId: command.id });
  }

  /** Drops both stacks. Callers wire this to `ProjectLoaded` once the Editor Service layer exists. */
  clear(): void {
    this.undoStack.length = 0;
    this.redoStack.length = 0;
  }

  get canUndo(): boolean {
    return this.undoStack.length > 0;
  }

  get canRedo(): boolean {
    return this.redoStack.length > 0;
  }

  /** Labels of undoable commands, oldest first — for a UI history panel. */
  get undoLabels(): string[] {
    return this.undoStack.map((command) => command.label);
  }

  /** Labels of redoable commands, most-recently-undone first — for a UI history panel. */
  get redoLabels(): string[] {
    return [...this.redoStack].reverse().map((command) => command.label);
  }
}
