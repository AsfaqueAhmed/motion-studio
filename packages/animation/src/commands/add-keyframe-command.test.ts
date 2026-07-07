import {
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
import { AddKeyframeCommand } from "./add-keyframe-command";

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
  return { engine, track };
}

describe("AddKeyframeCommand", () => {
  it("execute adds the keyframe; undo removes it; redo re-adds it", () => {
    const { engine, track } = setup();
    const keyframe = createKeyframe({ tick: toTick(0), value: 1 });
    const command = new AddKeyframeCommand("cmd-1", engine, track.id, keyframe);

    command.execute();
    expect(engine.requirePropertyTrack(track.id).keyframes).toEqual([keyframe]);

    command.undo();
    expect(engine.requirePropertyTrack(track.id).keyframes).toEqual([]);

    command.redo();
    expect(engine.requirePropertyTrack(track.id).keyframes).toEqual([keyframe]);
  });
});
