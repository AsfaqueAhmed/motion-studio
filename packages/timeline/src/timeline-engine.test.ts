import {
  TrackType,
  createCompositionId,
  createLayerId,
  createTrackId,
  createTrackItemId,
  toTick,
} from "@motion-studio/shared";
import { describe, expect, it } from "vitest";
import { TimelineEngine } from "./timeline-engine";
import { createComposition, createTrack, createTrackItem } from "./timeline-factory";

function setup() {
  const engine = new TimelineEngine();
  const composition = createComposition({
    id: createCompositionId("comp"),
    name: "Main",
    width: 1920,
    height: 1080,
    fps: 30,
    durationTicks: toTick(9000),
  });
  engine.compositions.add(composition);
  const track = createTrack({ id: createTrackId("v1"), type: TrackType.Video, label: "V1" });
  engine.addTrack(composition.id, track);
  return { engine, composition, track };
}

describe("TimelineEngine", () => {
  it("addTrack attaches the track id to the composition", () => {
    const { engine, composition, track } = setup();
    expect(engine.compositions.get(composition.id)?.tracks).toEqual([track.id]);
  });

  it("addTrackItem attaches the item id to the track", () => {
    const { engine, track } = setup();
    const item = createTrackItem({
      id: createTrackItemId("a"),
      trackId: track.id,
      layerId: createLayerId("layer-a"),
      startTick: toTick(0),
      durationTicks: toTick(900),
    });
    engine.addTrackItem(item);
    expect(engine.tracks.get(track.id)?.items).toEqual([item.id]);
  });

  it("addTrackItem rejects an item that overlaps an existing one on the same track", () => {
    const { engine, track } = setup();
    engine.addTrackItem(
      createTrackItem({
        id: createTrackItemId("a"),
        trackId: track.id,
        layerId: createLayerId("layer-a"),
        startTick: toTick(0),
        durationTicks: toTick(900),
      }),
    );
    expect(() =>
      engine.addTrackItem(
        createTrackItem({
          id: createTrackItemId("b"),
          trackId: track.id,
          layerId: createLayerId("layer-b"),
          startTick: toTick(450),
          durationTicks: toTick(900),
        }),
      ),
    ).toThrow(/overlaps/);
  });

  it("addTrackItem accepts an item that is exactly adjacent to an existing one", () => {
    const { engine, track } = setup();
    engine.addTrackItem(
      createTrackItem({
        id: createTrackItemId("a"),
        trackId: track.id,
        layerId: createLayerId("layer-a"),
        startTick: toTick(0),
        durationTicks: toTick(900),
      }),
    );
    expect(() =>
      engine.addTrackItem(
        createTrackItem({
          id: createTrackItemId("b"),
          trackId: track.id,
          layerId: createLayerId("layer-b"),
          startTick: toTick(900),
          durationTicks: toTick(900),
        }),
      ),
    ).not.toThrow();
  });

  it("removeTrack throws if the track still has items", () => {
    const { engine, composition, track } = setup();
    engine.addTrackItem(
      createTrackItem({
        id: createTrackItemId("a"),
        trackId: track.id,
        layerId: createLayerId("layer-a"),
        startTick: toTick(0),
        durationTicks: toTick(900),
      }),
    );
    expect(() => engine.removeTrack(composition.id, track.id)).toThrow(/still has items/);
  });

  it("moveTrackItem relocates an item to a different track", () => {
    const { engine, composition, track } = setup();
    const track2 = createTrack({ id: createTrackId("v2"), type: TrackType.Video, label: "V2" });
    engine.addTrack(composition.id, track2);
    const item = createTrackItem({
      id: createTrackItemId("a"),
      trackId: track.id,
      layerId: createLayerId("layer-a"),
      startTick: toTick(0),
      durationTicks: toTick(900),
    });
    engine.addTrackItem(item);

    engine.moveTrackItem(item.id, track2.id, toTick(1800));

    expect(engine.tracks.get(track.id)?.items).toEqual([]);
    expect(engine.tracks.get(track2.id)?.items).toEqual([item.id]);
    expect(engine.requireTrackItem(item.id).startTick).toBe(toTick(1800));
  });

  it("moveTrackItem rejects a destination that would overlap", () => {
    const { engine, track } = setup();
    engine.addTrackItem(
      createTrackItem({
        id: createTrackItemId("a"),
        trackId: track.id,
        layerId: createLayerId("layer-a"),
        startTick: toTick(0),
        durationTicks: toTick(900),
      }),
    );
    const itemB = createTrackItem({
      id: createTrackItemId("b"),
      trackId: track.id,
      layerId: createLayerId("layer-b"),
      startTick: toTick(1000),
      durationTicks: toTick(900),
    });
    engine.addTrackItem(itemB);

    expect(() => engine.moveTrackItem(itemB.id, track.id, toTick(450))).toThrow(/overlap/);
  });

  it("trimTrackItem on the 'in' edge shortens duration and advances trimInTick", () => {
    const { engine, track } = setup();
    const item = createTrackItem({
      id: createTrackItemId("a"),
      trackId: track.id,
      layerId: createLayerId("layer-a"),
      startTick: toTick(0),
      durationTicks: toTick(900),
    });
    engine.addTrackItem(item);

    engine.trimTrackItem(item.id, "in", toTick(300));

    const trimmed = engine.requireTrackItem(item.id);
    expect(trimmed.startTick).toBe(toTick(300));
    expect(trimmed.durationTicks).toBe(toTick(600));
    expect(trimmed.trimInTick).toBe(toTick(300));
    expect(trimmed.trimOutTick).toBe(toTick(900));
  });

  it("trimTrackItem on the 'out' edge shortens duration and pulls back trimOutTick", () => {
    const { engine, track } = setup();
    const item = createTrackItem({
      id: createTrackItemId("a"),
      trackId: track.id,
      layerId: createLayerId("layer-a"),
      startTick: toTick(0),
      durationTicks: toTick(900),
    });
    engine.addTrackItem(item);

    engine.trimTrackItem(item.id, "out", toTick(600));

    const trimmed = engine.requireTrackItem(item.id);
    expect(trimmed.startTick).toBe(toTick(0));
    expect(trimmed.durationTicks).toBe(toTick(600));
    expect(trimmed.trimInTick).toBe(toTick(0));
    expect(trimmed.trimOutTick).toBe(toTick(600));
  });

  it("trimTrackItem rejects a non-positive resulting duration", () => {
    const { engine, track } = setup();
    const item = createTrackItem({
      id: createTrackItemId("a"),
      trackId: track.id,
      layerId: createLayerId("layer-a"),
      startTick: toTick(0),
      durationTicks: toTick(900),
    });
    engine.addTrackItem(item);

    expect(() => engine.trimTrackItem(item.id, "in", toTick(900))).toThrow(/non-positive/);
  });

  it("setCompositionSize updates the composition's width/height", () => {
    const { engine, composition } = setup();

    engine.setCompositionSize(composition.id, 1080, 1920);

    expect(engine.requireComposition(composition.id)).toMatchObject({
      width: 1080,
      height: 1920,
    });
  });

  it("setCompositionSize rejects non-positive or non-integer dimensions", () => {
    const { engine, composition } = setup();

    expect(() => engine.setCompositionSize(composition.id, 0, 1080)).toThrow(/positive integers/);
    expect(() => engine.setCompositionSize(composition.id, 1920, -1)).toThrow(/positive integers/);
    expect(() => engine.setCompositionSize(composition.id, 1920.5, 1080)).toThrow(
      /positive integers/,
    );
  });
});
