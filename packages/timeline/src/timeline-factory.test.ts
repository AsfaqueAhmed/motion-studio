import {
  TrackType,
  createCompositionId,
  createLayerId,
  createTrackId,
  createTrackItemId,
  toTick,
} from "@motion-studio/shared";
import { describe, expect, it } from "vitest";
import { createComposition, createTrack, createTrackItem } from "./timeline-factory";

describe("timeline-factory", () => {
  it("createComposition defaults tracks to an empty array", () => {
    const composition = createComposition({
      id: createCompositionId("a"),
      name: "Main",
      width: 1920,
      height: 1080,
      fps: 30,
      durationTicks: toTick(9000),
    });
    expect(composition.tracks).toEqual([]);
  });

  it("createTrack defaults locked/muted to false and items to an empty array", () => {
    const track = createTrack({ id: createTrackId("v1"), type: TrackType.Video, label: "V1" });
    expect(track.locked).toBe(false);
    expect(track.muted).toBe(false);
    expect(track.items).toEqual([]);
  });

  it("createTrackItem defaults trimInTick to 0 and trimOutTick to trimInTick + durationTicks", () => {
    const item = createTrackItem({
      id: createTrackItemId("a"),
      trackId: createTrackId("v1"),
      layerId: createLayerId("layer-a"),
      startTick: toTick(300),
      durationTicks: toTick(900),
    });
    expect(item.trimInTick).toBe(toTick(0));
    expect(item.trimOutTick).toBe(toTick(900));
  });

  it("createTrackItem respects an explicit trimInTick", () => {
    const item = createTrackItem({
      id: createTrackItemId("a"),
      trackId: createTrackId("v1"),
      layerId: createLayerId("layer-a"),
      startTick: toTick(0),
      durationTicks: toTick(900),
      trimInTick: toTick(300),
    });
    expect(item.trimInTick).toBe(toTick(300));
    expect(item.trimOutTick).toBe(toTick(1200));
  });
});
