import type { ICommand, IKeyframe, PropertyTrackId, Tick } from "@motion-studio/shared";
import type { AnimationEngine } from "../animation-engine";

/** Deletes a single Keyframe from a Property Track. See docs/06-animation-engine/keyframes.md. */
export class DeleteKeyframeCommand implements ICommand {
  readonly label = "Delete keyframe";

  private deleted: IKeyframe | null = null;

  constructor(
    readonly id: string,
    private readonly engine: AnimationEngine,
    private readonly trackId: PropertyTrackId,
    private readonly tick: Tick,
  ) {}

  execute(): void {
    const track = this.engine.requirePropertyTrack(this.trackId);
    const keyframe = track.keyframes.find((existing) => existing.tick === this.tick);
    if (!keyframe) {
      throw new Error(
        `DeleteKeyframeCommand: track "${this.trackId}" has no keyframe at tick ${this.tick}`,
      );
    }
    this.deleted = { ...keyframe };
    this.engine.deleteKeyframe(this.trackId, this.tick);
  }

  undo(): void {
    if (!this.deleted) {
      throw new Error("DeleteKeyframeCommand: cannot undo before execute()");
    }
    this.engine.addKeyframe(this.trackId, this.deleted);
  }

  redo(): void {
    this.engine.deleteKeyframe(this.trackId, this.tick);
  }
}
