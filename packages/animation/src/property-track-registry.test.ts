import {
  createAnimationClipId,
  createPropertyTrackId,
  PropertyValueType,
} from "@motion-studio/shared";
import { describe, expect, it } from "vitest";
import { createPropertyTrack } from "./animation-factory";
import { PropertyTrackRegistry } from "./property-track-registry";

describe("PropertyTrackRegistry", () => {
  it("adds and retrieves a track by id", () => {
    const registry = new PropertyTrackRegistry();
    const track = createPropertyTrack({
      id: createPropertyTrackId("track-a"),
      clipId: createAnimationClipId("clip-a"),
      propertyKey: "opacity",
      valueType: PropertyValueType.Number,
    });
    registry.add(track);
    expect(registry.get(track.id)).toBe(track);
    expect(registry.has(track.id)).toBe(true);
  });

  it("throws when adding a duplicate id", () => {
    const registry = new PropertyTrackRegistry();
    const track = createPropertyTrack({
      id: createPropertyTrackId("track-a"),
      clipId: createAnimationClipId("clip-a"),
      propertyKey: "opacity",
      valueType: PropertyValueType.Number,
    });
    registry.add(track);
    expect(() => registry.add(track)).toThrow(/already registered/);
  });

  it("throws when removing an unknown id", () => {
    const registry = new PropertyTrackRegistry();
    expect(() => registry.remove(createPropertyTrackId("missing"))).toThrow(/unknown track/);
  });
});
