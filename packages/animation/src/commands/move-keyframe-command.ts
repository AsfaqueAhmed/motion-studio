import type { ICommand, PropertyTrackId, Tick } from "@motion-studio/shared";
import type { AnimationEngine } from "../animation-engine";

/** Repositions a Keyframe to a new tick on the same Property Track. See docs/06-animation-engine/keyframes.md. */
export class MoveKeyframeCommand implements ICommand {
  readonly label = "Move keyframe";

  constructor(
    readonly id: string,
    private readonly engine: AnimationEngine,
    private readonly trackId: PropertyTrackId,
    private readonly fromTick: Tick,
    private readonly toTick: Tick,
  ) {}

  execute(): void {
    this.engine.moveKeyframe(this.trackId, this.fromTick, this.toTick);
  }

  undo(): void {
    this.engine.moveKeyframe(this.trackId, this.toTick, this.fromTick);
  }

  redo(): void {
    this.execute();
  }
}
