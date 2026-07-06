import { toTick, type ICommand, type Tick, type TrackItemId } from "@motion-studio/shared";
import type { TimelineEngine } from "../timeline-engine";

/**
 * Splits one TrackItem into two at an absolute Timeline tick, preserving
 * combined duration and each half's offset into the source media. See
 * docs/07-timeline-engine/splitting.md.
 */
export class SplitTrackItemCommand implements ICommand {
  readonly label = "Split clip";

  private originalDurationTicks: Tick | null = null;
  private originalTrimOutTick: Tick | null = null;

  constructor(
    readonly id: string,
    private readonly engine: TimelineEngine,
    private readonly itemId: TrackItemId,
    private readonly atTick: Tick,
    private readonly newItemId: TrackItemId,
  ) {}

  execute(): void {
    const item = this.engine.requireTrackItem(this.itemId);
    const itemEnd = item.startTick + item.durationTicks;
    if (this.atTick <= item.startTick || this.atTick >= itemEnd) {
      throw new Error(
        `SplitTrackItemCommand: split tick ${this.atTick} is not strictly inside item "${this.itemId}"`,
      );
    }

    this.originalDurationTicks = item.durationTicks;
    this.originalTrimOutTick = item.trimOutTick;

    const firstHalfDuration = toTick(this.atTick - item.startTick);
    const splitTrimTick = toTick(item.trimInTick + firstHalfDuration);

    item.durationTicks = firstHalfDuration;
    item.trimOutTick = splitTrimTick;

    this.engine.addTrackItem({
      id: this.newItemId,
      trackId: item.trackId,
      layerId: item.layerId,
      startTick: this.atTick,
      durationTicks: toTick(itemEnd - this.atTick),
      trimInTick: splitTrimTick,
      trimOutTick: this.originalTrimOutTick,
    });
  }

  undo(): void {
    if (this.originalDurationTicks === null || this.originalTrimOutTick === null) {
      throw new Error("SplitTrackItemCommand: cannot undo before execute()");
    }
    this.engine.removeTrackItem(this.newItemId);
    const item = this.engine.requireTrackItem(this.itemId);
    item.durationTicks = this.originalDurationTicks;
    item.trimOutTick = this.originalTrimOutTick;
  }

  redo(): void {
    this.execute();
  }
}
