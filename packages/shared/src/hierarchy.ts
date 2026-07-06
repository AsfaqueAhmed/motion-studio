/** Read-only view a domain object exposes so `Hierarchy` can walk its tree. */
export interface IHierarchyNodeAccessor<TId> {
  getParentId(id: TId): TId | null;
  getChildIds(id: TId): readonly TId[];
}

/**
 * Generic, storage-free parent/child hierarchy algorithms (ADR-005
 * primitive #2 — see docs/DECISIONS.md). Deliberately owns no tree data of
 * its own: it reads through the accessor a caller provides, so the
 * Composition Graph (Layer Engine, `08-layer-engine/group-layer.md`) and
 * the future Asset Dependency Graph (Phase 12, `14-assets/metadata.md`)
 * can each keep parent/child state in their own domain shape (today:
 * `ILayerBase.parentId` / `IGroupLayer.childIds`) instead of this class
 * duplicating it. One implementation, multiple typed instantiations.
 */
export class Hierarchy<TId> {
  constructor(private readonly accessor: IHierarchyNodeAccessor<TId>) {}

  getAncestors(id: TId): TId[] {
    const result: TId[] = [];
    let current = this.accessor.getParentId(id);
    while (current !== null) {
      result.push(current);
      current = this.accessor.getParentId(current);
    }
    return result;
  }

  getDescendants(id: TId): TId[] {
    const result: TId[] = [];
    const stack: TId[] = [...this.accessor.getChildIds(id)];
    while (stack.length > 0) {
      const next = stack.pop() as TId;
      result.push(next);
      stack.push(...this.accessor.getChildIds(next));
    }
    return result;
  }

  isDescendantOf(id: TId, ancestorId: TId): boolean {
    return this.getAncestors(id).includes(ancestorId);
  }

  /**
   * Throws if reparenting `id` under `newParentId` would create a cycle
   * (including the trivial cycle of parenting a node under itself).
   */
  assertNoCycle(id: TId, newParentId: TId | null): void {
    if (newParentId === null) {
      return;
    }
    if (newParentId === id || this.isDescendantOf(newParentId, id)) {
      throw new Error("Hierarchy: reparenting would create a cycle");
    }
  }
}
