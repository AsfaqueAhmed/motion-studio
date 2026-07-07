import type { ICommand, IPropertyTrack } from "@motion-studio/shared";
import type { AnimationEngine } from "@motion-studio/animation";

/** Adds a `PropertyTrack` to its Clip. See `AddAnimationClipCommand`'s doc comment for why this lives here. */
export class AddPropertyTrackCommand implements ICommand {
  readonly label = "Add property track";

  constructor(
    readonly id: string,
    private readonly engine: AnimationEngine,
    private readonly track: IPropertyTrack,
  ) {}

  execute(): void {
    this.engine.addPropertyTrack(this.track);
  }

  undo(): void {
    this.engine.removePropertyTrack(this.track.id);
  }

  redo(): void {
    this.execute();
  }
}
