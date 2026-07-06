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
import { TrimTrackItemCommand } from "./trim-track-item-command";

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

describe("TrimTrackItemCommand", () => {
  it("execute trims the out edge; undo restores the original bounds", () => {
    const { engine, item } = setup();
    const command = new TrimTrackItemCommand("cmd-1", engine, item.id, "out", toTick(600));

    command.execute();
    expect(engine.requireTrackItem(item.id).durationTicks).toBe(toTick(600));
    expect(engine.requireTrackItem(item.id).trimOutTick).toBe(toTick(600));

    command.undo();
    expect(engine.requireTrackItem(item.id).durationTicks).toBe(toTick(900));
    expect(engine.requireTrackItem(item.id).trimOutTick).toBe(toTick(900));

    command.redo();
    expect(engine.requireTrackItem(item.id).durationTicks).toBe(toTick(600));
  });

  it("undo throws if called before execute", () => {
    const { engine, item } = setup();
    const command = new TrimTrackItemCommand("cmd-1", engine, item.id, "out", toTick(600));
    expect(() => command.undo()).toThrow(/cannot undo before execute/);
  });
});
