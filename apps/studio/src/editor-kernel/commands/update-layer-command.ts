import type { ICommand, LayerId } from "@motion-studio/shared";
import type { LayerEngine } from "@motion-studio/layer";
import { getLayerPropertyValue, setLayerPropertyValue } from "../layer-property-path";

/**
 * Patches one static (non-keyframed) property on a Layer — the Inspector's
 * edit path for a property that has no `AnimationClip`/`PropertyTrack` yet.
 * Captures the previous value in `execute()` for undo, following the same
 * "capture on execute, don't recapture on redo" rule
 * `MoveTrackItemCommand` uses.
 */
export class UpdateLayerCommand implements ICommand {
  readonly label = "Change property";

  private previousValue: unknown;

  constructor(
    readonly id: string,
    private readonly engine: LayerEngine,
    private readonly layerId: LayerId,
    private readonly propertyKey: string,
    private readonly value: unknown,
  ) {}

  execute(): void {
    const layer = this.requireLayer();
    this.previousValue = getLayerPropertyValue(layer, this.propertyKey);
    setLayerPropertyValue(layer, this.propertyKey, this.value);
  }

  undo(): void {
    setLayerPropertyValue(this.requireLayer(), this.propertyKey, this.previousValue);
  }

  redo(): void {
    setLayerPropertyValue(this.requireLayer(), this.propertyKey, this.value);
  }

  private requireLayer() {
    const layer = this.engine.registry.get(this.layerId);
    if (!layer) {
      throw new Error(`UpdateLayerCommand: unknown layer: "${this.layerId}"`);
    }
    return layer;
  }
}
