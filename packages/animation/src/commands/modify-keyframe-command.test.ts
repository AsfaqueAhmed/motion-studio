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
import { AnimationEngine } from "../animation-engine";
import { createAnimationClip, createKeyframe, createPropertyTrack } from "../animation-factory";
import { ModifyKeyframeCommand } from "./modify-keyframe-command";

function setup() {
  const engine = new AnimationEngine();
  engine.initialize();
  const clip = createAnimationClip({
    id: createAnimationClipId("clip-a"),
    layerId: createLayerId("layer-a"),
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
  engine.addKeyframe(
    track.id,
    createKeyframe({ tick: toTick(0), value: 0.5, interpolation: InterpolationType.Linear }),
  );
  return { engine, track };
}

describe("ModifyKeyframeCommand", () => {
  it("execute applies the changes; undo restores the original fields; redo re-applies them", () => {
    const { engine, track } = setup();
    const command = new ModifyKeyframeCommand("cmd-1", engine, track.id, toTick(0), {
      value: 1,
      interpolation: InterpolationType.Step,
    });

    command.execute();
    let keyframe = engine.requirePropertyTrack(track.id).keyframes[0]!;
    expect(keyframe.value).toBe(1);
    expect(keyframe.interpolation).toBe(InterpolationType.Step);

    command.undo();
    keyframe = engine.requirePropertyTrack(track.id).keyframes[0]!;
    expect(keyframe.value).toBe(0.5);
    expect(keyframe.interpolation).toBe(InterpolationType.Linear);

    command.redo();
    keyframe = engine.requirePropertyTrack(track.id).keyframes[0]!;
    expect(keyframe.value).toBe(1);
    expect(keyframe.interpolation).toBe(InterpolationType.Step);
  });
});
