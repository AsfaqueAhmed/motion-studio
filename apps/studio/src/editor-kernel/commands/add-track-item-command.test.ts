import {
  TrackType,
  createLayerId,
  createTrackId,
  createTrackItemId,
  toTick,
} from "@motion-studio/shared";
import { TimelineEngine, createTrack, createTrackItem } from "@motion-studio/timeline";
import { describe, expect, it } from "vitest";
import { AddTrackItemCommand } from "./add-track-item-command";

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
  return { engine, track, item };
}

describe("AddTrackItemCommand", () => {
  it("execute adds the item; undo removes it; redo re-adds it", () => {
    const { engine, track, item } = setup();
    const command = new AddTrackItemCommand("cmd-1", engine, item);

    command.execute();
    expect(engine.requireTrackItem(item.id)).toEqual(item);
    expect(engine.tracks.get(track.id)?.items).toEqual([item.id]);

    command.undo();
    expect(engine.trackItems.has(item.id)).toBe(false);
    expect(engine.tracks.get(track.id)?.items).toEqual([]);

    command.redo();
    expect(engine.requireTrackItem(item.id)).toEqual(item);
    expect(engine.tracks.get(track.id)?.items).toEqual([item.id]);
  });
});
