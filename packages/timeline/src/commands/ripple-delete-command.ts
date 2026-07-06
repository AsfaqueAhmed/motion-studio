import {
  toTick,
  type ICommand,
  type ITrackItem,
  type Tick,
  type TrackItemId,
} from "@motion-studio/shared";
import type { TimelineEngine } from "../timeline-engine";

interface IShiftedItem {
  id: TrackItemId;
  previousStartTick: Tick;
}

/**
 * Deletes a TrackItem and shifts every later item on the *same* track
 * backward by the deleted item's duration, closing the gap.
 *
 * ADR-010 (docs/DECISIONS.md) is still open on whether ripple should also
 * follow linked items on other tracks (e.g. a video's linked audio) — the
 * `ITrackItem` schema has no "linked item" concept yet, so this command
 * intentionally only ripples the deleted item's own track. Revisit once
 * ADR-010 is resolved and linking is modeled.
 */
export class RippleDeleteCommand implements ICommand {
  readonly label = "Ripple delete clip";

  private deleted: ITrackItem | null = null;
  private shifted: IShiftedItem[] = [];

  constructor(
    readonly id: string,
    private readonly engine: TimelineEngine,
    private readonly itemId: TrackItemId,
  ) {}

  execute(): void {
    const item = this.engine.requireTrackItem(this.itemId);
    this.deleted = { ...item };

    const laterItems = this.engine
      .getTrackItemsSorted(item.trackId)
      .filter((candidate) => candidate.startTick > item.startTick);

    this.shifted = laterItems.map((laterItem) => ({
      id: laterItem.id,
      previousStartTick: laterItem.startTick,
    }));

    this.engine.removeTrackItem(this.itemId);

    for (const { id: laterItemId, previousStartTick } of this.shifted) {
      this.engine.shiftTrackItemStart(laterItemId, toTick(previousStartTick - item.durationTicks));
    }
  }

  undo(): void {
    if (!this.deleted) {
      throw new Error("RippleDeleteCommand: cannot undo before execute()");
    }
    for (const { id: laterItemId, previousStartTick } of this.shifted) {
      this.engine.shiftTrackItemStart(laterItemId, previousStartTick);
    }
    this.engine.addTrackItem(this.deleted);
  }

  redo(): void {
    this.execute();
  }
}
