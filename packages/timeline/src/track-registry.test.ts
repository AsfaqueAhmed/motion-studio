import { TrackType, createTrackId } from "@motion-studio/shared";
import { describe, expect, it } from "vitest";
import { createTrack } from "./timeline-factory";
import { TrackRegistry } from "./track-registry";

describe("TrackRegistry", () => {
  it("add/get/has/remove round-trips a track", () => {
    const registry = new TrackRegistry();
    const track = createTrack({ id: createTrackId("v1"), type: TrackType.Video, label: "V1" });

    registry.add(track);
    expect(registry.has(track.id)).toBe(true);
    expect(registry.get(track.id)).toBe(track);
    expect(registry.getAll()).toEqual([track]);

    registry.remove(track.id);
    expect(registry.has(track.id)).toBe(false);
  });

  it("add throws on a duplicate id", () => {
    const registry = new TrackRegistry();
    const track = createTrack({ id: createTrackId("v1"), type: TrackType.Video, label: "V1" });
    registry.add(track);
    expect(() => registry.add(track)).toThrow(/already registered/);
  });

  it("remove throws on an unknown id", () => {
    const registry = new TrackRegistry();
    expect(() => registry.remove(createTrackId("missing"))).toThrow(/unknown track/);
  });
});
