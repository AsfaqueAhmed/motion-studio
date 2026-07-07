import { Dag, type LayerId } from "@motion-studio/shared";
import type { ISceneGraph } from "./scene-graph";

export type RenderGraphNodeId = string;

/**
 * One node in a layer's effect chain (Image → Blur → Shadow → Mask →
 * Blend → Output, per `compositor.md`). `dependencyIds` point at the
 * node(s) that must be evaluated first — typically the previous stage in
 * the chain.
 */
export interface IRenderGraphNode {
  readonly id: RenderGraphNodeId;
  readonly dependencyIds: readonly RenderGraphNodeId[];
}

/**
 * The Render Graph: per-Scene-Graph-node effect chain topology, executed
 * against the GPU backend for a given Scene Graph (ADR-005 primitive #3,
 * `Dag`). Effects Engine (Phase 8, `09-effects/`) is the intended source
 * of intermediate nodes (blur/glow/shadow/blend); until it exists, every
 * layer gets the identity chain — see `buildIdentityRenderGraph` — so the
 * topology is exercised today even with zero real effects registered.
 */
export class RenderGraph {
  private readonly nodes = new Map<RenderGraphNodeId, IRenderGraphNode>();
  private readonly dag = new Dag<RenderGraphNodeId>({
    getDependencyIds: (id) => this.nodes.get(id)?.dependencyIds ?? [],
  });

  addNode(node: IRenderGraphNode): void {
    this.nodes.set(node.id, node);
  }

  hasNode(id: RenderGraphNodeId): boolean {
    return this.nodes.has(id);
  }

  /** Dependency-first (inputs before outputs) evaluation order ending at `outputId`. Throws `DagCycleError` on a cycle. */
  executionOrder(outputId: RenderGraphNodeId): RenderGraphNodeId[] {
    return this.dag.topologicalOrder([outputId]);
  }
}

function outputNodeId(layerId: LayerId): RenderGraphNodeId {
  return `${layerId}:output`;
}

/**
 * One node per Scene Graph layer, with no intermediate effect nodes: the
 * "source" (the layer itself) and "output" chain length is 1. This is the
 * Render Graph's current real-world shape — every future effect
 * (`09-effects/`) inserts itself as a dependency of a layer's output node.
 */
export function buildIdentityRenderGraph(sceneGraph: ISceneGraph): RenderGraph {
  const graph = new RenderGraph();
  for (const node of sceneGraph.nodes) {
    graph.addNode({ id: outputNodeId(node.layerId), dependencyIds: [] });
  }
  return graph;
}

export { outputNodeId as getRenderGraphOutputNodeId };
