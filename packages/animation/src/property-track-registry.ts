import type { IPropertyTrack, PropertyTrackId } from "@motion-studio/shared";

/**
 * In-memory source of truth for `IPropertyTrack` objects, keyed by id.
 * Deliberately has no clip awareness — see `AnimationEngine`, the only
 * thing allowed to mutate an `IAnimationClip.propertyTrackIds` array.
 */
export class PropertyTrackRegistry {
  private readonly tracks = new Map<PropertyTrackId, IPropertyTrack>();

  add(track: IPropertyTrack): void {
    if (this.tracks.has(track.id)) {
      throw new Error(`PropertyTrackRegistry: track already registered: "${track.id}"`);
    }
    this.tracks.set(track.id, track);
  }

  get(id: PropertyTrackId): IPropertyTrack | undefined {
    return this.tracks.get(id);
  }

  has(id: PropertyTrackId): boolean {
    return this.tracks.has(id);
  }

  remove(id: PropertyTrackId): void {
    if (!this.tracks.delete(id)) {
      throw new Error(`PropertyTrackRegistry: unknown track: "${id}"`);
    }
  }

  getAll(): IPropertyTrack[] {
    return Array.from(this.tracks.values());
  }

  clear(): void {
    this.tracks.clear();
  }
}
