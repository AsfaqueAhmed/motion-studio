/** Read-only view a domain object exposes so `Dag` can walk its dependency edges. */
export interface IDagNodeAccessor<TId> {
  getDependencyIds(id: TId): readonly TId[];
}

/** Thrown by `Dag.topologicalOrder` when a dependency cycle is reachable from the given roots. */
export class DagCycleError<TId> extends Error {
  constructor(public readonly cyclePath: readonly TId[]) {
    super(`Dag: cycle detected: ${cyclePath.join(" -> ")}`);
    this.name = "DagCycleError";
  }
}

/**
 * Generic, storage-free DAG-with-cycle-detection evaluator (ADR-005
 * primitive #3 — see docs/DECISIONS.md). Owns no node data of its own: it
 * reads dependency edges through the accessor a caller provides. Backs the
 * Render Graph's effect chains (`05-rendering-engine/compositor.md`), the
 * Animation Engine's still-open multi-clip blending order
 * (`06-animation-engine/overview.md`), and the future Export Graph's
 * independent output branches. One implementation, multiple typed
 * instantiations.
 */
export class Dag<TId> {
  constructor(private readonly accessor: IDagNodeAccessor<TId>) {}

  /**
   * Dependency-first (topological) order reachable from `rootIds`: every
   * id appears after all of its dependencies. Throws `DagCycleError` if a
   * cycle is reachable from any root.
   */
  topologicalOrder(rootIds: readonly TId[]): TId[] {
    const visited = new Set<TId>();
    const inStack = new Set<TId>();
    const path: TId[] = [];
    const order: TId[] = [];

    const visit = (id: TId): void => {
      if (visited.has(id)) {
        return;
      }
      if (inStack.has(id)) {
        throw new DagCycleError([...path, id]);
      }
      inStack.add(id);
      path.push(id);
      for (const dependencyId of this.accessor.getDependencyIds(id)) {
        visit(dependencyId);
      }
      path.pop();
      inStack.delete(id);
      visited.add(id);
      order.push(id);
    };

    for (const rootId of rootIds) {
      visit(rootId);
    }
    return order;
  }

  /** Convenience check that swallows `DagCycleError` into a boolean. */
  hasCycle(rootIds: readonly TId[]): boolean {
    try {
      this.topologicalOrder(rootIds);
      return false;
    } catch (error) {
      if (error instanceof DagCycleError) {
        return true;
      }
      throw error;
    }
  }
}
