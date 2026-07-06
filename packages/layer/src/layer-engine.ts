import type { IEngine } from "@motion-studio/shared";
import { CompositionGraph } from "./composition-graph";
import { LayerRegistry } from "./layer-registry";

/**
 * Owns the "what" (CLAUDE.md engine ownership table): the Layer registry
 * and the persistent Composition Graph built on top of it. Never touches
 * time (Timeline) or pixels (Rendering) — see ARCHITECTURE.md §3.
 */
export class LayerEngine implements IEngine {
  readonly name = "Layer";
  readonly registry: LayerRegistry;
  readonly compositionGraph: CompositionGraph;

  constructor() {
    this.registry = new LayerRegistry();
    this.compositionGraph = new CompositionGraph(this.registry);
  }

  initialize(): void {
    // No async setup required — registry and graph are ready on construction.
  }

  ready(): void {}

  dispose(): void {
    this.registry.clear();
  }
}
