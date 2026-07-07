import type { ICommand, IKeyframe, PropertyTrackId } from "@motion-studio/shared";
import type { AnimationEngine } from "../animation-engine";

/** Adds a Keyframe to a Property Track. See docs/06-animation-engine/keyframes.md. */
export class AddKeyframeCommand implements ICommand {
  readonly label = "Add keyframe";

  constructor(
    readonly id: string,
    private readonly engine: AnimationEngine,
    private readonly trackId: PropertyTrackId,
    private readonly keyframe: IKeyframe,
  ) {}

  execute(): void {
    this.engine.addKeyframe(this.trackId, this.keyframe);
  }

  undo(): void {
    this.engine.deleteKeyframe(this.trackId, this.keyframe.tick);
  }

  redo(): void {
    this.execute();
  }
}
