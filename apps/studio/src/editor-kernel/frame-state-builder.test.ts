import {
  PropertyValueType,
  TrackType,
  createAnimationClipId,
  createAssetId,
  createCompositionId,
  createLayerId,
  createPropertyTrackId,
  createTrackId,
  createTrackItemId,
  toTick,
} from "@motion-studio/shared";
import { LayerEngine, createImageLayer } from "@motion-studio/layer";
import {
  TimelineEngine,
  createComposition,
  createTrack,
  createTrackItem,
} from "@motion-studio/timeline";
import {
  AnimationEngine,
  createAnimationClip,
  createKeyframe,
  createPropertyTrack,
} from "@motion-studio/animation";
import { beforeEach, describe, expect, it } from "vitest";
import { buildFrameState } from "./frame-state-builder";

describe("buildFrameState", () => {
  let layerEngine: LayerEngine;
  let timelineEngine: TimelineEngine;
  let animationEngine: AnimationEngine;
  const compositionId = createCompositionId("comp-1");
  const trackId = createTrackId("track-1");
  const layerId = createLayerId("layer-1");
  const itemId = createTrackItemId("item-1");

  beforeEach(() => {
    layerEngine = new LayerEngine();
    timelineEngine = new TimelineEngine();
    animationEngine = new AnimationEngine();
    animationEngine.initialize();

    timelineEngine.compositions.add(
      createComposition({
        id: compositionId,
        name: "Comp",
        width: 100,
        height: 100,
        fps: 30,
        durationTicks: toTick(9000),
      }),
    );
    timelineEngine.addTrack(
      compositionId,
      createTrack({ id: trackId, type: TrackType.Video, label: "V1" }),
    );

    layerEngine.compositionGraph.addLayer(
      createImageLayer({ id: layerId, name: "Image", assetId: createAssetId("asset-1") }),
    );
    timelineEngine.addTrackItem(
      createTrackItem({
        id: itemId,
        trackId,
        layerId,
        startTick: toTick(100),
        durationTicks: toTick(200),
      }),
    );
  });

  it("omits a layer whose TrackItem does not cover the requested tick", () => {
    const frameState = buildFrameState(
      toTick(50),
      compositionId,
      timelineEngine,
      layerEngine,
      animationEngine,
    );
    expect(frameState.layers).toHaveLength(0);
  });

  it("includes a layer whose TrackItem covers the requested tick, using its static transform", () => {
    const frameState = buildFrameState(
      toTick(150),
      compositionId,
      timelineEngine,
      layerEngine,
      animationEngine,
    );
    expect(frameState.layers).toHaveLength(1);
    expect(frameState.layers[0]?.layerId).toBe(layerId);
    expect(frameState.layers[0]?.transform.x).toBe(0);
  });

  it("uses the evaluated keyframe value over the Layer's static value when a clip exists", () => {
    const clip = createAnimationClip({
      id: createAnimationClipId("clip-1"),
      layerId,
      layerType: layerEngine.registry.get(layerId)!.type,
      name: "anim",
    });
    animationEngine.addClip(clip);
    const track = createPropertyTrack({
      id: createPropertyTrackId("track-x"),
      clipId: clip.id,
      propertyKey: "transform.x",
      valueType: PropertyValueType.Number,
    });
    animationEngine.addPropertyTrack(track);
    animationEngine.addKeyframe(track.id, createKeyframe({ tick: toTick(100), value: 42 }));
    animationEngine.addKeyframe(track.id, createKeyframe({ tick: toTick(300), value: 42 }));

    const frameState = buildFrameState(
      toTick(150),
      compositionId,
      timelineEngine,
      layerEngine,
      animationEngine,
    );
    expect(frameState.layers[0]?.transform.x).toBe(42);
  });

  it("excludes a layer that is not effectively visible", () => {
    const layer = layerEngine.registry.get(layerId)!;
    layer.visible = false;
    const frameState = buildFrameState(
      toTick(150),
      compositionId,
      timelineEngine,
      layerEngine,
      animationEngine,
    );
    expect(frameState.layers).toHaveLength(0);
  });

  it("populates assetId for an asset-backed layer and falls back to placeholder bounds without a dimensionsLookup", () => {
    const frameState = buildFrameState(
      toTick(150),
      compositionId,
      timelineEngine,
      layerEngine,
      animationEngine,
    );
    expect(frameState.layers[0]?.assetId).toBe(createAssetId("asset-1"));
    expect(frameState.layers[0]?.bounds).toEqual({ x: 0, y: 0, width: 200, height: 200 });
  });

  it("uses dimensionsLookup's bounds for an asset-backed layer when it resolves", () => {
    const frameState = buildFrameState(
      toTick(150),
      compositionId,
      timelineEngine,
      layerEngine,
      animationEngine,
      (assetId) =>
        assetId === createAssetId("asset-1")
          ? { x: 0, y: 0, width: 1920, height: 1080 }
          : undefined,
    );
    expect(frameState.layers[0]?.bounds).toEqual({ x: 0, y: 0, width: 1920, height: 1080 });
  });
});
