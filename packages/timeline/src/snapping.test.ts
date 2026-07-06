import {
  TrackType,
  createLayerId,
  createTrackId,
  createTrackItemId,
  toTick,
} from "@motion-studio/shared";
import { describe, expect, it } from "vitest";
import { getClipEdgeTicks, nearestGridTick, snapTick } from "./snapping";
import { createTrack, createTrackItem } from "./timeline-factory";
import { TimelineEngine } from "./timeline-engine";

describe("snapTick", () => {
  it("snaps to the nearest target within the threshold", () => {
    expect(snapTick(toTick(103), [toTick(100), toTick(200)], toTick(10))).toBe(toTick(100));
  });

  it("returns the candidate unchanged when no target is within the threshold", () => {
    expect(snapTick(toTick(150), [toTick(100), toTick(200)], toTick(10))).toBe(toTick(150));
  });
});

describe("nearestGridTick", () => {
  it("rounds to the nearest multiple of the grid size", () => {
    expect(nearestGridTick(toTick(44), toTick(30))).toBe(toTick(30));
    expect(nearestGridTick(toTick(46), toTick(30))).toBe(toTick(60));
  });
});

describe("getClipEdgeTicks", () => {
  it("returns start/end ticks for every item on the track, excluding the given item", () => {
    const engine = new TimelineEngine();
    const track = createTrack({ id: createTrackId("v1"), type: TrackType.Video, label: "V1" });
    engine.tracks.add(track);
    const itemA = createTrackItem({
      id: createTrackItemId("a"),
      trackId: track.id,
      layerId: createLayerId("layer-a"),
      startTick: toTick(0),
      durationTicks: toTick(900),
    });
    const itemB = createTrackItem({
      id: createTrackItemId("b"),
      trackId: track.id,
      layerId: createLayerId("layer-b"),
      startTick: toTick(900),
      durationTicks: toTick(300),
    });
    engine.addTrackItem(itemA);
    engine.addTrackItem(itemB);

    expect(getClipEdgeTicks(engine, track.id, itemA.id)).toEqual([toTick(900), toTick(1200)]);
  });
});
