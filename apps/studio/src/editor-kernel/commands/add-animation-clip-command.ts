import type { IAnimationClip, ICommand } from "@motion-studio/shared";
import type { AnimationEngine } from "@motion-studio/animation";

/**
 * Adds an `AnimationClip` — the container a Layer's `PropertyTrack`s attach
 * to. `@motion-studio/animation` has Commands for keyframe mutation but none
 * for creating the Clip/PropertyTrack containers themselves (nothing needed
 * that before the Inspector's "first keyframe on this property" flow
 * existed). Lives here alongside `AddPropertyTrackCommand`, bundled into the
 * same `CompositeCommand` as the keyframe add so undoing the first keyframe
 * on a property also removes the now-empty clip it created.
 */
export class AddAnimationClipCommand implements ICommand {
  readonly label = "Add animation clip";

  constructor(
    readonly id: string,
    private readonly engine: AnimationEngine,
    private readonly clip: IAnimationClip,
  ) {}

  execute(): void {
    this.engine.addClip(this.clip);
  }

  undo(): void {
    this.engine.removeClip(this.clip.id);
  }

  redo(): void {
    this.execute();
  }
}
