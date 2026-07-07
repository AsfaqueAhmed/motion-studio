import { createAssetId, createLayerId, toTick } from "@motion-studio/shared";
import { LayerEngine, createImageLayer } from "@motion-studio/layer";
import { AnimationEngine } from "@motion-studio/animation";
import { HistoryEngine } from "@motion-studio/history";
import { beforeEach, describe, expect, it } from "vitest";
import { CommandBus } from "../command-bus";
import { InspectorEditorService } from "./inspector-editor-service";

describe("InspectorEditorService", () => {
  let layerEngine: LayerEngine;
  let animationEngine: AnimationEngine;
  let commandBus: CommandBus;
  let service: InspectorEditorService;
  const layerId = createLayerId("layer-1");

  beforeEach(() => {
    layerEngine = new LayerEngine();
    animationEngine = new AnimationEngine();
    animationEngine.initialize();
    commandBus = new CommandBus(new HistoryEngine());
    service = new InspectorEditorService(layerEngine, animationEngine, commandBus);

    layerEngine.compositionGraph.addLayer(
      createImageLayer({ id: layerId, name: "Image", assetId: createAssetId("asset-1") }),
    );
  });

  it("sets a static property and undoes back to the previous value", () => {
    service.setLayerProperty({
      type: "SetLayerProperty",
      payload: { layerId, propertyKey: "opacity", value: 0.5 },
    });
    expect(layerEngine.registry.get(layerId)?.opacity).toBe(0.5);

    commandBus.undo();
    expect(layerEngine.registry.get(layerId)?.opacity).toBe(1);
  });

  it("creates the Clip and PropertyTrack for a Layer's first keyframe", () => {
    service.addKeyframe({
      type: "AddKeyframe",
      payload: {
        layerId,
        layerType: layerEngine.registry.get(layerId)!.type,
        propertyKey: "opacity",
        tick: toTick(0),
        value: 0.2,
      },
    });

    const clip = animationEngine.getClipForLayer(layerId);
    expect(clip).toBeDefined();
    expect(animationEngine.evaluateAt(layerId, "opacity", toTick(0))).toBe(0.2);
  });

  it("undoing the first keyframe also removes the Clip/PropertyTrack it created", () => {
    service.addKeyframe({
      type: "AddKeyframe",
      payload: {
        layerId,
        layerType: layerEngine.registry.get(layerId)!.type,
        propertyKey: "opacity",
        tick: toTick(0),
        value: 0.2,
      },
    });

    commandBus.undo();

    expect(animationEngine.getClipForLayer(layerId)).toBeUndefined();
  });

  it("reuses the existing Clip/PropertyTrack for a second keyframe on the same property", () => {
    service.addKeyframe({
      type: "AddKeyframe",
      payload: {
        layerId,
        layerType: layerEngine.registry.get(layerId)!.type,
        propertyKey: "opacity",
        tick: toTick(0),
        value: 0.2,
      },
    });
    const clipAfterFirst = animationEngine.getClipForLayer(layerId);

    service.addKeyframe({
      type: "AddKeyframe",
      payload: {
        layerId,
        layerType: layerEngine.registry.get(layerId)!.type,
        propertyKey: "opacity",
        tick: toTick(90),
        value: 0.8,
      },
    });

    expect(animationEngine.getClipForLayer(layerId)?.id).toBe(clipAfterFirst?.id);

    commandBus.undo();
    expect(animationEngine.getClipForLayer(layerId)?.id).toBe(clipAfterFirst?.id);
  });
});
