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
import { DeleteKeyframeCommand } from "./delete-keyframe-command";

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
  const keyframe = createKeyframe({ tick: toTick(0), value: 1 });
  engine.addKeyframe(track.id, keyframe);
  return { engine, track, keyframe };
}

describe("DeleteKeyframeCommand", () => {
  it("execute removes the keyframe; undo re-adds it identically; redo removes it again", () => {
    const { engine, track, keyframe } = setup();
    const command = new DeleteKeyframeCommand("cmd-1", engine, track.id, keyframe.tick);

    command.execute();
    expect(engine.requirePropertyTrack(track.id).keyframes).toEqual([]);

    command.undo();
    expect(engine.requirePropertyTrack(track.id).keyframes).toEqual([keyframe]);

    command.redo();
    expect(engine.requirePropertyTrack(track.id).keyframes).toEqual([]);
  });

  it("execute throws if there is no keyframe at that tick", () => {
    const { engine, track } = setup();
    const command = new DeleteKeyframeCommand("cmd-1", engine, track.id, toTick(999));
    expect(() => command.execute()).toThrow(/no keyframe/);
  });
});
