import type { ICommand, Tick, TrackId, TrackItemId } from "@motion-studio/shared";
import type { TimelineEngine } from "../timeline-engine";

/** Moves a TrackItem to a new track and/or start tick. See docs/07-timeline-engine/clips.md. */
export class MoveTrackItemCommand implements ICommand {
  readonly label = "Move clip";

  private previousTrackId: TrackId | null = null;
  private previousStartTick: Tick | null = null;

  constructor(
    readonly id: string,
    private readonly engine: TimelineEngine,
    private readonly itemId: TrackItemId,
    private readonly toTrackId: TrackId,
    private readonly toStartTick: Tick,
  ) {}

  execute(): void {
    const item = this.engine.requireTrackItem(this.itemId);
    this.previousTrackId = item.trackId;
    this.previousStartTick = item.startTick;
    this.engine.moveTrackItem(this.itemId, this.toTrackId, this.toStartTick);
  }

  undo(): void {
    if (this.previousTrackId === null || this.previousStartTick === null) {
      throw new Error("MoveTrackItemCommand: cannot undo before execute()");
    }
    this.engine.moveTrackItem(this.itemId, this.previousTrackId, this.previousStartTick);
  }

  redo(): void {
    this.engine.moveTrackItem(this.itemId, this.toTrackId, this.toStartTick);
  }
}
