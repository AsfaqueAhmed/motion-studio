import type { ICommand, Tick, TrackItemId } from "@motion-studio/shared";
import type { TimelineEngine } from "../timeline-engine";

interface ITrimSnapshot {
  startTick: Tick;
  durationTicks: Tick;
  trimInTick: Tick;
  trimOutTick: Tick;
}

/**
 * Trims a TrackItem's `in` or `out` edge to a new absolute Timeline tick.
 * See docs/07-timeline-engine/trimming.md.
 */
export class TrimTrackItemCommand implements ICommand {
  readonly label = "Trim clip";

  private before: ITrimSnapshot | null = null;

  constructor(
    readonly id: string,
    private readonly engine: TimelineEngine,
    private readonly itemId: TrackItemId,
    private readonly edge: "in" | "out",
    private readonly newTimelineTick: Tick,
  ) {}

  execute(): void {
    this.before = this.snapshot();
    this.engine.trimTrackItem(this.itemId, this.edge, this.newTimelineTick);
  }

  undo(): void {
    if (!this.before) {
      throw new Error("TrimTrackItemCommand: cannot undo before execute()");
    }
    const item = this.engine.requireTrackItem(this.itemId);
    item.startTick = this.before.startTick;
    item.durationTicks = this.before.durationTicks;
    item.trimInTick = this.before.trimInTick;
    item.trimOutTick = this.before.trimOutTick;
  }

  redo(): void {
    this.engine.trimTrackItem(this.itemId, this.edge, this.newTimelineTick);
  }

  private snapshot(): ITrimSnapshot {
    const item = this.engine.requireTrackItem(this.itemId);
    return {
      startTick: item.startTick,
      durationTicks: item.durationTicks,
      trimInTick: item.trimInTick,
      trimOutTick: item.trimOutTick,
    };
  }
}
