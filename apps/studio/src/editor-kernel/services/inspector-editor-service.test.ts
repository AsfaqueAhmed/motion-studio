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
      payload: { layerId, propertyKey: "opacity", value: 0.5, tick: toTick(0) },
    });
    expect(layerEngine.registry.get(layerId)?.opacity).toBe(0.5);

    commandBus.undo();
    expect(layerEngine.registry.get(layerId)?.opacity).toBe(1);
  });

  it("applies a batched transform patch as one undo step", () => {
    service.setLayerTransform({
      type: "SetLayerTransform",
      payload: { layerId, transform: { x: 50, y: 60, scaleX: 2, scaleY: 2 }, tick: toTick(0) },
    });
    expect(layerEngine.registry.get(layerId)?.transform).toMatchObject({
      x: 50,
      y: 60,
      scaleX: 2,
      scaleY: 2,
    });
    expect(commandBus.canUndo).toBe(true);

    commandBus.undo();
    expect(layerEngine.registry.get(layerId)?.transform).toMatchObject({
      x: 0,
      y: 0,
      scaleX: 1,
      scaleY: 1,
    });
    expect(commandBus.canUndo).toBe(false);
  });

  it("toggling on creates the Clip and a PropertyTrack for all 5 transform keys, in one undo step", () => {
    service.toggleKeyframe({
      type: "ToggleKeyframe",
      payload: { layerId, layerType: layerEngine.registry.get(layerId)!.type, tick: toTick(0) },
    });

    const clip = animationEngine.getClipForLayer(layerId);
    expect(clip).toBeDefined();
    for (const [key, expected] of [
      ["x", 0],
      ["y", 0],
      ["scaleX", 1],
      ["scaleY", 1],
      ["rotation", 0],
    ] as const) {
      expect(animationEngine.evaluateAt(layerId, `transform.${key}`, toTick(0))).toBe(expected);
    }
    expect(commandBus.canUndo).toBe(true);
  });

  it("undoing the toggle-on removes the Clip/PropertyTracks it created, as one step", () => {
    service.toggleKeyframe({
      type: "ToggleKeyframe",
      payload: { layerId, layerType: layerEngine.registry.get(layerId)!.type, tick: toTick(0) },
    });

    commandBus.undo();

    expect(animationEngine.getClipForLayer(layerId)).toBeUndefined();
    expect(commandBus.canUndo).toBe(false);
  });

  it("toggling again at the same tick removes the keyframes it just added (toggle off)", () => {
    const layerType = layerEngine.registry.get(layerId)!.type;
    service.toggleKeyframe({
      type: "ToggleKeyframe",
      payload: { layerId, layerType, tick: toTick(0) },
    });

    service.toggleKeyframe({
      type: "ToggleKeyframe",
      payload: { layerId, layerType, tick: toTick(0) },
    });

    expect(animationEngine.evaluateAt(layerId, "transform.x", toTick(0))).toBeUndefined();
  });

  it("toggling at a different tick reuses the existing Clip instead of creating a second one", () => {
    const layerType = layerEngine.registry.get(layerId)!.type;
    service.toggleKeyframe({
      type: "ToggleKeyframe",
      payload: { layerId, layerType, tick: toTick(0) },
    });
    const clipAfterFirst = animationEngine.getClipForLayer(layerId);

    service.toggleKeyframe({
      type: "ToggleKeyframe",
      payload: { layerId, layerType, tick: toTick(90) },
    });

    expect(animationEngine.getClipForLayer(layerId)?.id).toBe(clipAfterFirst?.id);
  });

  it("editing an animated property at an existing keyframe's tick modifies that keyframe, not the static field", () => {
    const layerType = layerEngine.registry.get(layerId)!.type;
    service.toggleKeyframe({
      type: "ToggleKeyframe",
      payload: { layerId, layerType, tick: toTick(0) },
    });

    service.setLayerProperty({
      type: "SetLayerProperty",
      payload: { layerId, propertyKey: "transform.x", value: 42, tick: toTick(0) },
    });

    expect(animationEngine.evaluateAt(layerId, "transform.x", toTick(0))).toBe(42);
    // The static field is untouched — the keyframe is the source of truth once animated.
    expect(layerEngine.registry.get(layerId)?.transform.x).toBe(0);
  });

  it("editing an animated property at a tick with no keyframe does not create one — only the toggle button creates keyframes", () => {
    const layerType = layerEngine.registry.get(layerId)!.type;
    service.toggleKeyframe({
      type: "ToggleKeyframe",
      payload: { layerId, layerType, tick: toTick(0) },
    });

    service.setLayerProperty({
      type: "SetLayerProperty",
      payload: { layerId, propertyKey: "transform.x", value: 100, tick: toTick(300) },
    });

    // No keyframe was added at tick 300 — the existing tick-0 keyframe
    // still evaluates as a constant everywhere, so the edit's value is
    // invisible until a keyframe is explicitly added at that tick.
    expect(animationEngine.evaluateAt(layerId, "transform.x", toTick(300))).toBe(0);
    // The write landed on the (now-shadowed) static field, not a new keyframe.
    expect(layerEngine.registry.get(layerId)?.transform.x).toBe(100);
    expect(
      animationEngine
        .getClipForLayer(layerId)
        ?.propertyTrackIds.map((id) => animationEngine.propertyTracks.get(id))
        .find((track) => track?.propertyKey === "transform.x")?.keyframes,
    ).toHaveLength(1);
  });
});
