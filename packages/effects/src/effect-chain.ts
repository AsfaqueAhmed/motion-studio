import { Dag, type EffectNodeId } from "@motion-studio/shared";
import type { IEffectNode } from "./effect-node";

/**
 * Dependency-first ordering for a set of effect nodes, ending at `outputId`.
 * Reuses the generic `Dag` primitive (ADR-005 #3) rather than growing a
 * fourth graph type — `RenderGraph` (`packages/rendering`) uses the same
 * primitive for the exact same shape, but Effects orders its own nodes
 * independently so a caller can validate/preview a chain before handing it
 * to Rendering. Throws `DagCycleError` on a cyclic chain.
 */
export function orderEffectChain(
  nodes: readonly IEffectNode[],
  outputId: EffectNodeId,
): IEffectNode[] {
  const byId = new Map(nodes.map((node) => [node.id, node]));
  const dag = new Dag<EffectNodeId>({
    getDependencyIds: (id) => byId.get(id)?.dependencyIds ?? [],
  });
  return dag.topologicalOrder([outputId]).map((id) => {
    const node = byId.get(id);
    if (!node) {
      throw new Error(`orderEffectChain: no node registered for id "${id}"`);
    }
    return node;
  });
}
