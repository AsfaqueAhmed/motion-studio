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
import { SplitTrackItemCommand } from "./split-track-item-command";

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

describe("SplitTrackItemCommand", () => {
  it("execute splits the item into two adjacent, gapless items", () => {
    const { engine, item } = setup();
    const command = new SplitTrackItemCommand(
      "cmd-1",
      engine,
      item.id,
      toTick(300),
      createTrackItemId("b"),
    );

    command.execute();

    const first = engine.requireTrackItem(item.id);
    const second = engine.requireTrackItem(createTrackItemId("b"));
    expect(first.durationTicks).toBe(toTick(300));
    expect(first.trimOutTick).toBe(toTick(300));
    expect(second.startTick).toBe(toTick(300));
    expect(second.durationTicks).toBe(toTick(600));
    expect(second.trimInTick).toBe(toTick(300));
    expect(second.trimOutTick).toBe(toTick(900));
  });

  it("undo removes the new item and restores the original bounds", () => {
    const { engine, item } = setup();
    const command = new SplitTrackItemCommand(
      "cmd-1",
      engine,
      item.id,
      toTick(300),
      createTrackItemId("b"),
    );
    command.execute();

    command.undo();

    expect(engine.trackItems.has(createTrackItemId("b"))).toBe(false);
    const restored = engine.requireTrackItem(item.id);
    expect(restored.durationTicks).toBe(toTick(900));
    expect(restored.trimOutTick).toBe(toTick(900));
  });

  it("redo re-splits the item identically to the original execute", () => {
    const { engine, item } = setup();
    const command = new SplitTrackItemCommand(
      "cmd-1",
      engine,
      item.id,
      toTick(300),
      createTrackItemId("b"),
    );
    command.execute();
    command.undo();

    command.redo();

    const first = engine.requireTrackItem(item.id);
    const second = engine.requireTrackItem(createTrackItemId("b"));
    expect(first.durationTicks).toBe(toTick(300));
    expect(first.trimOutTick).toBe(toTick(300));
    expect(second.startTick).toBe(toTick(300));
    expect(second.durationTicks).toBe(toTick(600));
    expect(second.trimInTick).toBe(toTick(300));
    expect(second.trimOutTick).toBe(toTick(900));
  });

  it("rejects a split tick outside the item's bounds", () => {
    const { engine, item } = setup();
    const command = new SplitTrackItemCommand(
      "cmd-1",
      engine,
      item.id,
      toTick(900),
      createTrackItemId("b"),
    );
    expect(() => command.execute()).toThrow(/not strictly inside/);
  });
});
