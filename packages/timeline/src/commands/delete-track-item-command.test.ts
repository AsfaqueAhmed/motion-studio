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
import { DeleteTrackItemCommand } from "./delete-track-item-command";

function setup() {
  const engine = new TimelineEngine();
  const track = createTrack({ id: createTrackId("v1"), type: TrackType.Video, label: "V1" });
  engine.tracks.add(track);
  const item = createTrackItem({
    id: createTrackItemId("a"),
    trackId: track.id,
    layerId: createLayerId("layer-a"),
    startTick: toTick(0),
    durationTicks: toTick(900),
  });
  engine.addTrackItem(item);
  return { engine, track, item };
}

describe("DeleteTrackItemCommand", () => {
  it("execute removes the item; undo re-adds it identically", () => {
    const { engine, track, item } = setup();
    const command = new DeleteTrackItemCommand("cmd-1", engine, item.id);

    command.execute();
    expect(engine.trackItems.has(item.id)).toBe(false);
    expect(engine.tracks.get(track.id)?.items).toEqual([]);

    command.undo();
    expect(engine.requireTrackItem(item.id)).toEqual(item);
    expect(engine.tracks.get(track.id)?.items).toEqual([item.id]);

    command.redo();
    expect(engine.trackItems.has(item.id)).toBe(false);
  });

  it("undo throws if called before execute", () => {
    const { engine, item } = setup();
    const command = new DeleteTrackItemCommand("cmd-1", engine, item.id);
    expect(() => command.undo()).toThrow(/cannot undo before execute/);
  });
});
