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
import { MoveKeyframeCommand } from "./move-keyframe-command";

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
  engine.addKeyframe(track.id, createKeyframe({ tick: toTick(0), value: 1 }));
  return { engine, track };
}

describe("MoveKeyframeCommand", () => {
  it("execute moves the keyframe; undo restores the original tick; redo re-moves it", () => {
    const { engine, track } = setup();
    const command = new MoveKeyframeCommand("cmd-1", engine, track.id, toTick(0), toTick(300));

    command.execute();
    expect(engine.requirePropertyTrack(track.id).keyframes.map((k) => k.tick)).toEqual([
      toTick(300),
    ]);

    command.undo();
    expect(engine.requirePropertyTrack(track.id).keyframes.map((k) => k.tick)).toEqual([toTick(0)]);

    command.redo();
    expect(engine.requirePropertyTrack(track.id).keyframes.map((k) => k.tick)).toEqual([
      toTick(300),
    ]);
  });
});
