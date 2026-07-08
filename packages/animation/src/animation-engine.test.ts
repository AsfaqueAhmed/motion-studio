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
import { AnimationEngine } from "./animation-engine";
import { createAnimationClip, createKeyframe, createPropertyTrack } from "./animation-factory";

function setup() {
  const engine = new AnimationEngine();
  engine.initialize();
  const layerId = createLayerId("layer-a");
  const clip = createAnimationClip({
    id: createAnimationClipId("clip-a"),
    layerId,
    layerType: LayerType.Text,
    name: "Fade In",
  });
  engine.addClip(clip);
  const track = createPropertyTrack({
    id: createPropertyTrackId("track-opacity"),
    clipId: clip.id,
    propertyKey: "opacity",
    valueType: PropertyValueType.Number,
  });
  engine.addPropertyTrack(track);
  return { engine, layerId, clip, track };
}

describe("AnimationEngine", () => {
  it("initialize registers the builtin properties", () => {
    const engine = new AnimationEngine();
    engine.initialize();
    expect(engine.properties.has(LayerType.Text, "opacity")).toBe(true);
    expect(engine.properties.has(LayerType.Shape, "fillColor")).toBe(true);
  });

  it("addClip rejects a second clip for the same layer", () => {
    const { engine, layerId } = setup();
    const secondClip = createAnimationClip({
      id: createAnimationClipId("clip-b"),
      layerId,
      layerType: LayerType.Text,
      name: "Fade Out",
    });
    expect(() => engine.addClip(secondClip)).toThrow(/already has an AnimationClip/);
  });

  it("addPropertyTrack rejects a second track for the same property on one clip", () => {
    const { engine, clip } = setup();
    const duplicate = createPropertyTrack({
      id: createPropertyTrackId("track-opacity-2"),
      clipId: clip.id,
      propertyKey: "opacity",
      valueType: PropertyValueType.Number,
    });
    expect(() => engine.addPropertyTrack(duplicate)).toThrow(/already has a track/);
  });

  it("addPropertyTrack rejects a value type mismatch against the registry", () => {
    const { engine, clip } = setup();
    const mismatched = createPropertyTrack({
      id: createPropertyTrackId("track-color"),
      clipId: clip.id,
      propertyKey: "color",
      valueType: PropertyValueType.Number,
    });
    expect(() => engine.addPropertyTrack(mismatched)).toThrow(/registered as/);
  });

  it("addKeyframe rejects a value that fails the property's validator", () => {
    const { engine, track } = setup();
    expect(() =>
      engine.addKeyframe(track.id, createKeyframe({ tick: toTick(0), value: 5 })),
    ).toThrow(/invalid value/);
  });

  it("addKeyframe rejects a duplicate tick", () => {
    const { engine, track } = setup();
    engine.addKeyframe(track.id, createKeyframe({ tick: toTick(0), value: 0 }));
    expect(() =>
      engine.addKeyframe(track.id, createKeyframe({ tick: toTick(0), value: 1 })),
    ).toThrow(/already has a keyframe/);
  });

  it("moveKeyframe repositions a keyframe and keeps the track sorted", () => {
    const { engine, track } = setup();
    engine.addKeyframe(track.id, createKeyframe({ tick: toTick(0), value: 0 }));
    engine.addKeyframe(track.id, createKeyframe({ tick: toTick(300), value: 1 }));

    engine.moveKeyframe(track.id, toTick(300), toTick(600));

    expect(engine.requirePropertyTrack(track.id).keyframes.map((k) => k.tick)).toEqual([
      toTick(0),
      toTick(600),
    ]);
  });

  it("deleteKeyframe removes the keyframe at the given tick", () => {
    const { engine, track } = setup();
    engine.addKeyframe(track.id, createKeyframe({ tick: toTick(0), value: 0 }));
    engine.deleteKeyframe(track.id, toTick(0));
    expect(engine.requirePropertyTrack(track.id).keyframes).toEqual([]);
  });

  it("modifyKeyframe rejects a new value that fails validation", () => {
    const { engine, track } = setup();
    engine.addKeyframe(track.id, createKeyframe({ tick: toTick(0), value: 0 }));
    expect(() => engine.modifyKeyframe(track.id, toTick(0), { value: 5 })).toThrow(/invalid value/);
  });

  it("evaluateAt interpolates between two keyframes", () => {
    const { engine, layerId, track } = setup();
    engine.addKeyframe(track.id, createKeyframe({ tick: toTick(0), value: 0 }));
    engine.addKeyframe(
      track.id,
      createKeyframe({ tick: toTick(100), value: 1, interpolation: InterpolationType.Linear }),
    );

    expect(engine.evaluateAt(layerId, "opacity", toTick(50))).toBeCloseTo(0.5);
    expect(engine.evaluateAt(layerId, "opacity", toTick(0))).toBe(0);
    expect(engine.evaluateAt(layerId, "opacity", toTick(100))).toBe(1);
  });

  it("evaluateAt returns undefined for a layer with no clip", () => {
    const engine = new AnimationEngine();
    engine.initialize();
    expect(engine.evaluateAt(createLayerId("no-clip"), "opacity", toTick(0))).toBeUndefined();
  });

  it("evaluateAt returns undefined for a property with no keyframes", () => {
    const { engine, layerId } = setup();
    expect(engine.evaluateAt(layerId, "opacity", toTick(0))).toBeUndefined();
  });

  it("removeClip removes every property track it owns", () => {
    const { engine, clip, track } = setup();
    engine.removeClip(clip.id);
    expect(engine.propertyTracks.has(track.id)).toBe(false);
    expect(engine.clips.has(clip.id)).toBe(false);
  });

  it("getKeyframeTicksForLayer returns undefined for a layer with no clip", () => {
    const engine = new AnimationEngine();
    engine.initialize();
    expect(engine.getKeyframeTicksForLayer(createLayerId("no-clip"))).toEqual([]);
  });

  it("getKeyframeTicksForLayer dedupes and sorts ticks across every property track on the layer", () => {
    const { engine, layerId, clip, track } = setup();
    const secondTrack = createPropertyTrack({
      id: createPropertyTrackId("track-x"),
      clipId: clip.id,
      propertyKey: "transform.x",
      valueType: PropertyValueType.Number,
    });
    engine.addPropertyTrack(secondTrack);

    engine.addKeyframe(track.id, createKeyframe({ tick: toTick(300), value: 1 }));
    engine.addKeyframe(track.id, createKeyframe({ tick: toTick(0), value: 0 }));
    engine.addKeyframe(secondTrack.id, createKeyframe({ tick: toTick(0), value: 10 }));
    engine.addKeyframe(secondTrack.id, createKeyframe({ tick: toTick(150), value: 20 }));

    expect(engine.getKeyframeTicksForLayer(layerId)).toEqual([toTick(0), toTick(150), toTick(300)]);
  });
});
