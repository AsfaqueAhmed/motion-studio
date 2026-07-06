import type { ITrack, TrackId } from "@motion-studio/shared";

/**
 * In-memory source of truth for `ITrack` objects, keyed by id. Deliberately
 * has no composition/item awareness — those invariants live in
 * `TimelineEngine`, which is the only thing that should mutate a track's
 * `items` array or a composition's `tracks` array after creation.
 */
export class TrackRegistry {
  private readonly tracks = new Map<TrackId, ITrack>();

  add(track: ITrack): void {
    if (this.tracks.has(track.id)) {
      throw new Error(`TrackRegistry: track already registered: "${track.id}"`);
    }
    this.tracks.set(track.id, track);
  }

  get(id: TrackId): ITrack | undefined {
    return this.tracks.get(id);
  }

  has(id: TrackId): boolean {
    return this.tracks.has(id);
  }

  remove(id: TrackId): void {
    if (!this.tracks.delete(id)) {
      throw new Error(`TrackRegistry: unknown track: "${id}"`);
    }
  }

  getAll(): ITrack[] {
    return Array.from(this.tracks.values());
  }

  clear(): void {
    this.tracks.clear();
  }
}
