/** Axis-aligned bounds in a node's local coordinate space (e.g. layer bounds, clip layout rect). */
export interface IBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** Read-only view a domain object exposes so `DirtyTrackedGraph` can walk it. */
export interface IDirtyGraphNodeAccessor<TId> {
  getParentId(id: TId): TId | null;
  getChildIds(id: TId): readonly TId[];
  getBounds(id: TId): IBounds;
  isVisible(id: TId): boolean;
}

function intersects(a: IBounds, b: IBounds): boolean {
  return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
}

/**
 * Generic, storage-free dirty-tracked/virtualization-ready node graph
 * (ADR-005 primitive #1 — see docs/DECISIONS.md). Owns only the dirty-flag
 * set; structure (parent/child, bounds, visibility) is read through the
 * accessor a caller provides. Backs the Rendering Engine's ephemeral
 * per-frame Scene Graph (`05-rendering-engine/scene-graph.md`) today;
 * Timeline UI's virtualized clip layout and Canvas overlay nodes are
 * documented future consumers of the same primitive.
 */
export class DirtyTrackedGraph<TId> {
  private readonly dirty = new Set<TId>();

  constructor(private readonly accessor: IDirtyGraphNodeAccessor<TId>) {}

  /** Marks `id` and every descendant dirty — a transform change cascades to children. */
  markDirty(id: TId): void {
    this.dirty.add(id);
    for (const childId of this.accessor.getChildIds(id)) {
      this.markDirty(childId);
    }
  }

  clearDirty(id: TId): void {
    this.dirty.delete(id);
  }

  clearAll(): void {
    this.dirty.clear();
  }

  isDirty(id: TId): boolean {
    return this.dirty.has(id);
  }

  get dirtyCount(): number {
    return this.dirty.size;
  }

  /** Ids from `ids` that are visible and whose bounds intersect `viewport` — for virtualized layout/rendering. */
  queryVisible(ids: readonly TId[], viewport: IBounds): TId[] {
    return ids.filter(
      (id) => this.accessor.isVisible(id) && intersects(this.accessor.getBounds(id), viewport),
    );
  }

  /** Visible-in-`viewport` ids that are also dirty — the set that actually needs re-rendering this pass. */
  queryDirtyVisible(ids: readonly TId[], viewport: IBounds): TId[] {
    return this.queryVisible(ids, viewport).filter((id) => this.isDirty(id));
  }
}
