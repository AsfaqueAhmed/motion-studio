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
import { RippleDeleteCommand } from "./ripple-delete-command";

function setup() {
  const engine = new TimelineEngine();
  const track = createTrack({ id: createTrackId("v1"), type: TrackType.Video, label: "V1" });
  engine.tracks.add(track);
  const itemA = createTrackItem({
    id: createTrackItemId("a"),
    trackId: track.id,
    layerId: createLayerId("layer-a"),
    startTick: toTick(0),
    durationTicks: toTick(300),
  });
  const itemB = createTrackItem({
    id: createTrackItemId("b"),
    trackId: track.id,
    layerId: createLayerId("layer-b"),
    startTick: toTick(300),
    durationTicks: toTick(300),
  });
  const itemC = createTrackItem({
    id: createTrackItemId("c"),
    trackId: track.id,
    layerId: createLayerId("layer-c"),
    startTick: toTick(600),
    durationTicks: toTick(300),
  });
  engine.addTrackItem(itemA);
  engine.addTrackItem(itemB);
  engine.addTrackItem(itemC);
  return { engine, track, itemA, itemB, itemC };
}

describe("RippleDeleteCommand", () => {
  it("execute deletes the item and shifts every later item back to close the gap", () => {
    const { engine, itemA, itemB, itemC } = setup();
    const command = new RippleDeleteCommand("cmd-1", engine, itemA.id);

    command.execute();

    expect(engine.trackItems.has(itemA.id)).toBe(false);
    expect(engine.requireTrackItem(itemB.id).startTick).toBe(toTick(0));
    expect(engine.requireTrackItem(itemC.id).startTick).toBe(toTick(300));
  });

  it("undo restores the deleted item and every shifted item's original position", () => {
    const { engine, itemA, itemB, itemC } = setup();
    const command = new RippleDeleteCommand("cmd-1", engine, itemA.id);
    command.execute();

    command.undo();

    expect(engine.requireTrackItem(itemA.id)).toEqual(itemA);
    expect(engine.requireTrackItem(itemB.id).startTick).toBe(toTick(300));
    expect(engine.requireTrackItem(itemC.id).startTick).toBe(toTick(600));
  });

  it("redo re-deletes the item and re-shifts every later item identically", () => {
    const { engine, itemA, itemB, itemC } = setup();
    const command = new RippleDeleteCommand("cmd-1", engine, itemA.id);
    command.execute();
    command.undo();

    command.redo();

    expect(engine.trackItems.has(itemA.id)).toBe(false);
    expect(engine.requireTrackItem(itemB.id).startTick).toBe(toTick(0));
    expect(engine.requireTrackItem(itemC.id).startTick).toBe(toTick(300));
  });

  it("does not shift items earlier than the deleted item", () => {
    const { engine, itemB, itemC } = setup();
    const command = new RippleDeleteCommand("cmd-1", engine, itemC.id);

    command.execute();

    expect(engine.requireTrackItem(itemB.id).startTick).toBe(toTick(300));
  });
});
