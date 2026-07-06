import type { ITrackItem, TrackItemId } from "@motion-studio/shared";

/**
 * In-memory source of truth for `ITrackItem` objects, keyed by id.
 * Deliberately has no track awareness — see `TrackRegistry` and
 * `TimelineEngine`.
 */
export class TrackItemRegistry {
  private readonly items = new Map<TrackItemId, ITrackItem>();

  add(item: ITrackItem): void {
    if (this.items.has(item.id)) {
      throw new Error(`TrackItemRegistry: track item already registered: "${item.id}"`);
    }
    this.items.set(item.id, item);
  }

  get(id: TrackItemId): ITrackItem | undefined {
    return this.items.get(id);
  }

  has(id: TrackItemId): boolean {
    return this.items.has(id);
  }

  remove(id: TrackItemId): void {
    if (!this.items.delete(id)) {
      throw new Error(`TrackItemRegistry: unknown track item: "${id}"`);
    }
  }

  getAll(): ITrackItem[] {
    return Array.from(this.items.values());
  }

  clear(): void {
    this.items.clear();
  }
}
