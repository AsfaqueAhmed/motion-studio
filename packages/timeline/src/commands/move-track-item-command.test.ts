import {
  TrackType,
  createLayerId,
  createTrackId,
  createTrackItemId,
  toTick,
} from "@motion-studio/shared";
import { describe, expect, it } from "vitest";
import { createTrack, createTrackItem } from "../timeline-factory";
import { TimelineEngine } from "../timeline-engine";
import { MoveTrackItemCommand } from "./move-track-item-command";

function setup() {
  const engine = new TimelineEngine();
  const trackA = createTrack({ id: createTrackId("v1"), type: TrackType.Video, label: "V1" });
  const trackB = createTrack({ id: createTrackId("v2"), type: TrackType.Video, label: "V2" });
  engine.tracks.add(trackA);
  engine.tracks.add(trackB);
  const item = createTrackItem({
    id: createTrackItemId("a"),
    trackId: trackA.id,
    layerId: createLayerId("layer-a"),
    startTick: toTick(0),
    durationTicks: toTick(900),
  });
  engine.addTrackItem(item);
  return { engine, trackA, trackB, item };
}

describe("MoveTrackItemCommand", () => {
  it("execute moves the item; undo restores the original track and tick", () => {
    const { engine, trackA, trackB, item } = setup();
    const command = new MoveTrackItemCommand("cmd-1", engine, item.id, trackB.id, toTick(1800));

    command.execute();
    expect(engine.requireTrackItem(item.id).trackId).toBe(trackB.id);
    expect(engine.requireTrackItem(item.id).startTick).toBe(toTick(1800));
    expect(engine.tracks.get(trackA.id)?.items).toEqual([]);

    command.undo();
    expect(engine.requireTrackItem(item.id).trackId).toBe(trackA.id);
    expect(engine.requireTrackItem(item.id).startTick).toBe(toTick(0));
    expect(engine.tracks.get(trackA.id)?.items).toEqual([item.id]);

    command.redo();
    expect(engine.requireTrackItem(item.id).trackId).toBe(trackB.id);
    expect(engine.requireTrackItem(item.id).startTick).toBe(toTick(1800));
  });

  it("undo throws if called before execute", () => {
    const { engine, trackB, item } = setup();
    const command = new MoveTrackItemCommand("cmd-1", engine, item.id, trackB.id, toTick(1800));
    expect(() => command.undo()).toThrow(/cannot undo before execute/);
  });
});
