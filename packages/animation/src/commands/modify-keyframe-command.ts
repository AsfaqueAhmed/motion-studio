import type { ICommand, IKeyframe, PropertyTrackId, Tick } from "@motion-studio/shared";
import type { AnimationEngine } from "../animation-engine";

type IKeyframeChanges = Partial<Pick<IKeyframe, "value" | "interpolation" | "bezierControlPoints">>;

/** Changes a Keyframe's value/interpolation/bezier handles in place. See docs/06-animation-engine/keyframes.md. */
export class ModifyKeyframeCommand implements ICommand {
  readonly label = "Modify keyframe";

  private before: IKeyframeChanges | null = null;

  constructor(
    readonly id: string,
    private readonly engine: AnimationEngine,
    private readonly trackId: PropertyTrackId,
    private readonly tick: Tick,
    private readonly changes: IKeyframeChanges,
  ) {}

  execute(): void {
    const track = this.engine.requirePropertyTrack(this.trackId);
    const keyframe = track.keyframes.find((existing) => existing.tick === this.tick);
    if (!keyframe) {
      throw new Error(
        `ModifyKeyframeCommand: track "${this.trackId}" has no keyframe at tick ${this.tick}`,
      );
    }
    const { tick: _tick, ...before } = keyframe;
    this.before = before;
    this.engine.modifyKeyframe(this.trackId, this.tick, this.changes);
  }

  undo(): void {
    if (!this.before) {
      throw new Error("ModifyKeyframeCommand: cannot undo before execute()");
    }
    this.engine.modifyKeyframe(this.trackId, this.tick, this.before);
  }

  redo(): void {
    this.engine.modifyKeyframe(this.trackId, this.tick, this.changes);
  }
}
