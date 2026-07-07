import {
  InterpolationType,
  LayerType,
  PropertyValueType,
  createAnimationClipId,
  createLayerId,
  createPropertyTrackId,
  toTick,
} from "@motion-studio/shared";
import { describe, expect, it } from "vitest";
import { createAnimationClip, createKeyframe, createPropertyTrack } from "./animation-factory";

describe("createAnimationClip", () => {
  it("defaults propertyTrackIds to an empty array", () => {
    const clip = createAnimationClip({
      id: createAnimationClipId("clip-a"),
      layerId: createLayerId("layer-a"),
      layerType: LayerType.Text,
      name: "Fade In",
    });
    expect(clip.propertyTrackIds).toEqual([]);
  });
});

describe("createPropertyTrack", () => {
  it("defaults keyframes to an empty array", () => {
    const track = createPropertyTrack({
      id: createPropertyTrackId("track-a"),
      clipId: createAnimationClipId("clip-a"),
      propertyKey: "opacity",
      valueType: PropertyValueType.Number,
    });
    expect(track.keyframes).toEqual([]);
  });

  it("sorts out-of-order input keyframes by tick", () => {
    const track = createPropertyTrack({
      id: createPropertyTrackId("track-a"),
      clipId: createAnimationClipId("clip-a"),
      propertyKey: "opacity",
      valueType: PropertyValueType.Number,
      keyframes: [
        createKeyframe({ tick: toTick(900), value: 1 }),
        createKeyframe({ tick: toTick(0), value: 0 }),
      ],
    });
    expect(track.keyframes.map((k) => k.tick)).toEqual([toTick(0), toTick(900)]);
  });
});

describe("createKeyframe", () => {
  it("defaults interpolation to Linear and omits bezierControlPoints", () => {
    const keyframe = createKeyframe({ tick: toTick(0), value: 1 });
    expect(keyframe.interpolation).toBe(InterpolationType.Linear);
    expect(keyframe.bezierControlPoints).toBeUndefined();
    expect("bezierControlPoints" in keyframe).toBe(false);
  });

  it("carries an explicit bezierControlPoints value through", () => {
    const points = { x1: 0.42, y1: 0, x2: 0.58, y2: 1 };
    const keyframe = createKeyframe({
      tick: toTick(0),
      value: 1,
      interpolation: InterpolationType.Bezier,
      bezierControlPoints: points,
    });
    expect(keyframe.bezierControlPoints).toEqual(points);
  });
});
