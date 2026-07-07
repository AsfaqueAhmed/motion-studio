import type { ICommand, ITrackItem } from "@motion-studio/shared";
import type { TimelineEngine } from "@motion-studio/timeline";

/**
 * Adds a TrackItem — the inverse of `@motion-studio/timeline`'s existing
 * `DeleteTrackItemCommand`, which that package has but this one doesn't
 * (nothing there needed to *add* an item outside a test fixture before the
 * Editor UI existed). Lives here rather than upstream until a second
 * consumer justifies moving it, matching `AddLayerCommand`'s placement.
 */
export class AddTrackItemCommand implements ICommand {
  readonly label = "Add clip";

  constructor(
    readonly id: string,
    private readonly engine: TimelineEngine,
    private readonly item: ITrackItem,
  ) {}

  execute(): void {
    this.engine.addTrackItem(this.item);
  }

  undo(): void {
    this.engine.removeTrackItem(this.item.id);
  }

  redo(): void {
    this.execute();
  }
}
