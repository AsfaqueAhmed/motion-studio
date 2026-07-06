import type {
  CompositionId,
  IComposition,
  IEngine,
  ITrack,
  ITrackItem,
  Tick,
  TrackId,
  TrackItemId,
} from "@motion-studio/shared";
import { CompositionRegistry } from "./composition-registry";
import { TrackItemRegistry } from "./track-item-registry";
import { TrackRegistry } from "./track-registry";

/**
 * Owns the "when" (CLAUDE.md engine ownership table): Composition → Track →
 * TrackItem, referencing Layers by id only. Never touches rendering,
 * decoding, or storage — see ARCHITECTURE.md §3. Composes the three
 * registries and is the only thing allowed to mutate `IComposition.tracks`
 * or `ITrack.items` after creation, so those arrays can never drift out of
 * sync with the registries.
 */
export class TimelineEngine implements IEngine {
  readonly name = "Timeline";
  readonly compositions = new CompositionRegistry();
  readonly tracks = new TrackRegistry();
  readonly trackItems = new TrackItemRegistry();

  initialize(): void {
    // No async setup required — registries are ready on construction.
  }

  ready(): void {}

  dispose(): void {
    this.compositions.clear();
    this.tracks.clear();
    this.trackItems.clear();
  }

  addTrack(compositionId: CompositionId, track: ITrack): void {
    const composition = this.requireComposition(compositionId);
    this.tracks.add(track);
    composition.tracks = [...composition.tracks, track.id];
  }

  /** Fails fast if the track still has items — callers must remove/move them first, mirroring `CompositionGraph.removeLayer`. */
  removeTrack(compositionId: CompositionId, trackId: TrackId): void {
    const composition = this.requireComposition(compositionId);
    const track = this.requireTrack(trackId);
    if (track.items.length > 0) {
      throw new Error(
        `TimelineEngine: cannot remove track "${trackId}" — it still has items; remove them first.`,
      );
    }
    composition.tracks = composition.tracks.filter((id) => id !== trackId);
    this.tracks.remove(trackId);
  }

  addTrackItem(item: ITrackItem): void {
    const track = this.requireTrack(item.trackId);
    if (this.overlaps(item.trackId, item.id, item.startTick, item.durationTicks)) {
      throw new Error(
        `TimelineEngine: track item "${item.id}" overlaps an existing item on track "${item.trackId}".`,
      );
    }
    this.trackItems.add(item);
    track.items = [...track.items, item.id];
  }

  removeTrackItem(id: TrackItemId): void {
    const item = this.requireTrackItem(id);
    const track = this.requireTrack(item.trackId);
    track.items = track.items.filter((itemId) => itemId !== id);
    this.trackItems.remove(id);
  }

  /** Moves an item to a new track and/or start tick, validating there's no overlap at the destination first. */
  moveTrackItem(id: TrackItemId, toTrackId: TrackId, toStartTick: Tick): void {
    const item = this.requireTrackItem(id);
    const toTrack = this.requireTrack(toTrackId);
    if (this.overlaps(toTrackId, id, toStartTick, item.durationTicks)) {
      throw new Error(
        `TimelineEngine: moving track item "${id}" to track "${toTrackId}" at tick ${toStartTick} would overlap an existing item.`,
      );
    }
    const fromTrack = this.requireTrack(item.trackId);
    if (fromTrack.id !== toTrack.id) {
      fromTrack.items = fromTrack.items.filter((itemId) => itemId !== id);
      toTrack.items = [...toTrack.items, id];
    }
    item.trackId = toTrackId;
    item.startTick = toStartTick;
  }

  /**
   * Trims an item's `in` or `out` edge to a new absolute position on the
   * Timeline, adjusting `startTick`/`durationTicks` and the corresponding
   * `trimInTick`/`trimOutTick` offset into the source media together so
   * they never drift apart. See docs/07-timeline-engine/trimming.md.
   */
  trimTrackItem(id: TrackItemId, edge: "in" | "out", newTimelineTick: Tick): void {
    const item = this.requireTrackItem(id);
    let nextStartTick = item.startTick;
    let nextDurationTicks = item.durationTicks;
    let nextTrimInTick = item.trimInTick;
    let nextTrimOutTick = item.trimOutTick;

    if (edge === "in") {
      const deltaTicks = newTimelineTick - item.startTick;
      nextStartTick = newTimelineTick;
      nextDurationTicks = (item.durationTicks - deltaTicks) as Tick;
      nextTrimInTick = (item.trimInTick + deltaTicks) as Tick;
    } else {
      const itemEnd = item.startTick + item.durationTicks;
      const deltaTicks = newTimelineTick - itemEnd;
      nextDurationTicks = (item.durationTicks + deltaTicks) as Tick;
      nextTrimOutTick = (item.trimOutTick + deltaTicks) as Tick;
    }

    if (nextDurationTicks <= 0) {
      throw new Error(`TimelineEngine: trimming "${id}" would leave a non-positive duration.`);
    }
    if (nextTrimInTick < 0 || nextTrimInTick >= nextTrimOutTick) {
      throw new Error(`TimelineEngine: trimming "${id}" would produce an invalid trim range.`);
    }
    if (this.overlaps(item.trackId, id, nextStartTick, nextDurationTicks)) {
      throw new Error(`TimelineEngine: trimming "${id}" would overlap an existing item.`);
    }

    item.startTick = nextStartTick;
    item.durationTicks = nextDurationTicks;
    item.trimInTick = nextTrimInTick;
    item.trimOutTick = nextTrimOutTick;
  }

  /**
   * Repositions an item's start tick on its current track without an
   * overlap check. Only safe for callers (e.g. `RippleDeleteCommand`) that
   * can prove the shift preserves non-overlap by construction — everything
   * else should go through `moveTrackItem`.
   */
  shiftTrackItemStart(id: TrackItemId, toStartTick: Tick): void {
    const item = this.requireTrackItem(id);
    item.startTick = toStartTick;
  }

  getTrackItemsSorted(trackId: TrackId): ITrackItem[] {
    const track = this.requireTrack(trackId);
    return track.items
      .map((itemId) => this.requireTrackItem(itemId))
      .sort((a, b) => a.startTick - b.startTick);
  }

  overlaps(
    trackId: TrackId,
    excludeItemId: TrackItemId | null,
    startTick: Tick,
    durationTicks: Tick,
  ): boolean {
    const end = startTick + durationTicks;
    return this.getTrackItemsSorted(trackId).some((existing) => {
      if (existing.id === excludeItemId) {
        return false;
      }
      const existingEnd = existing.startTick + existing.durationTicks;
      return startTick < existingEnd && existing.startTick < end;
    });
  }

  requireComposition(id: CompositionId): IComposition {
    const composition = this.compositions.get(id);
    if (!composition) {
      throw new Error(`TimelineEngine: unknown composition: "${id}"`);
    }
    return composition;
  }

  requireTrack(id: TrackId): ITrack {
    const track = this.tracks.get(id);
    if (!track) {
      throw new Error(`TimelineEngine: unknown track: "${id}"`);
    }
    return track;
  }

  requireTrackItem(id: TrackItemId): ITrackItem {
    const item = this.trackItems.get(id);
    if (!item) {
      throw new Error(`TimelineEngine: unknown track item: "${id}"`);
    }
    return item;
  }
}
