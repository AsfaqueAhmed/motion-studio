import type { ICommand, ITrackItem, TrackItemId } from "@motion-studio/shared";
import type { TimelineEngine } from "../timeline-engine";

/** Deletes a single TrackItem, leaving a gap on its track. See docs/07-timeline-engine/clips.md. */
export class DeleteTrackItemCommand implements ICommand {
  readonly label = "Delete clip";

  private deleted: ITrackItem | null = null;

  constructor(
    readonly id: string,
    private readonly engine: TimelineEngine,
    private readonly itemId: TrackItemId,
  ) {}

  execute(): void {
    this.deleted = { ...this.engine.requireTrackItem(this.itemId) };
    this.engine.removeTrackItem(this.itemId);
  }

  undo(): void {
    if (!this.deleted) {
      throw new Error("DeleteTrackItemCommand: cannot undo before execute()");
    }
    this.engine.addTrackItem(this.deleted);
  }

  redo(): void {
    this.engine.removeTrackItem(this.itemId);
  }
}
