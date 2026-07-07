import type { ICommand, ILayer } from "@motion-studio/shared";
import type { LayerEngine } from "@motion-studio/layer";

/**
 * Adds a Layer to the Composition Graph. Mirrors the shape of
 * `@motion-studio/timeline`'s commands (`id`, owning engine, then args) —
 * `@motion-studio/layer` had zero `ICommand` implementations before this;
 * this is the first, so it lives here rather than in that package until a
 * second Layer command justifies moving it upstream.
 */
export class AddLayerCommand implements ICommand {
  readonly label = "Add layer";

  constructor(
    readonly id: string,
    private readonly engine: LayerEngine,
    private readonly layer: ILayer,
  ) {}

  execute(): void {
    this.engine.compositionGraph.addLayer(this.layer);
  }

  undo(): void {
    this.engine.compositionGraph.removeLayer(this.layer.id);
  }

  redo(): void {
    this.execute();
  }
}
