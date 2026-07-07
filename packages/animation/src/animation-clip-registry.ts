import type { AnimationClipId, IAnimationClip } from "@motion-studio/shared";

/** In-memory source of truth for `IAnimationClip` objects, keyed by id. */
export class AnimationClipRegistry {
  private readonly clips = new Map<AnimationClipId, IAnimationClip>();

  add(clip: IAnimationClip): void {
    if (this.clips.has(clip.id)) {
      throw new Error(`AnimationClipRegistry: clip already registered: "${clip.id}"`);
    }
    this.clips.set(clip.id, clip);
  }

  get(id: AnimationClipId): IAnimationClip | undefined {
    return this.clips.get(id);
  }

  has(id: AnimationClipId): boolean {
    return this.clips.has(id);
  }

  remove(id: AnimationClipId): void {
    if (!this.clips.delete(id)) {
      throw new Error(`AnimationClipRegistry: unknown clip: "${id}"`);
    }
  }

  getAll(): IAnimationClip[] {
    return Array.from(this.clips.values());
  }

  clear(): void {
    this.clips.clear();
  }
}
