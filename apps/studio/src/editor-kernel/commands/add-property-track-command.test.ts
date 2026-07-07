import {
  LayerType,
  PropertyValueType,
  createAnimationClipId,
  createLayerId,
  createPropertyTrackId,
} from "@motion-studio/shared";
import {
  AnimationEngine,
  createAnimationClip,
  createPropertyTrack,
} from "@motion-studio/animation";
import { describe, expect, it } from "vitest";
import { AddPropertyTrackCommand } from "./add-property-track-command";

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
  return { engine, clip, track };
}

describe("AddPropertyTrackCommand", () => {
  it("execute adds the track to its clip; undo removes it; redo re-adds it", () => {
    const { engine, clip, track } = setup();
    const command = new AddPropertyTrackCommand("cmd-1", engine, track);

    command.execute();
    expect(engine.requirePropertyTrack(track.id)).toEqual(track);
    expect(engine.requireClip(clip.id).propertyTrackIds).toEqual([track.id]);

    command.undo();
    expect(engine.propertyTracks.has(track.id)).toBe(false);
    expect(engine.requireClip(clip.id).propertyTrackIds).toEqual([]);

    command.redo();
    expect(engine.requirePropertyTrack(track.id)).toEqual(track);
    expect(engine.requireClip(clip.id).propertyTrackIds).toEqual([track.id]);
  });
});
