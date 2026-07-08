import type { CompositionId, ICommand } from "@motion-studio/shared";
import type { TimelineEngine } from "../timeline-engine";

interface ISizeSnapshot {
  width: number;
  height: number;
}

/** Changes a Composition's output frame size (width/height). See docs/07-timeline-engine/overview.md. */
export class UpdateCompositionSizeCommand implements ICommand {
  readonly label = "Change frame size";

  private before: ISizeSnapshot | null = null;

  constructor(
    readonly id: string,
    private readonly engine: TimelineEngine,
    private readonly compositionId: CompositionId,
    private readonly width: number,
    private readonly height: number,
  ) {}

  execute(): void {
    this.before = this.snapshot();
    this.engine.setCompositionSize(this.compositionId, this.width, this.height);
  }

  undo(): void {
    if (!this.before) {
      throw new Error("UpdateCompositionSizeCommand: cannot undo before execute()");
    }
    this.engine.setCompositionSize(this.compositionId, this.before.width, this.before.height);
  }

  redo(): void {
    this.engine.setCompositionSize(this.compositionId, this.width, this.height);
  }

  private snapshot(): ISizeSnapshot {
    const composition = this.engine.requireComposition(this.compositionId);
    return { width: composition.width, height: composition.height };
  }
}
