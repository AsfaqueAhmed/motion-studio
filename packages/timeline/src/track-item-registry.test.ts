import { createLayerId, createTrackId, createTrackItemId, toTick } from "@motion-studio/shared";
import { describe, expect, it } from "vitest";
import { createTrackItem } from "./timeline-factory";
import { TrackItemRegistry } from "./track-item-registry";

describe("TrackItemRegistry", () => {
  it("add/get/has/remove round-trips a track item", () => {
    const registry = new TrackItemRegistry();
    const item = createTrackItem({
      id: createTrackItemId("a"),
      trackId: createTrackId("v1"),
      layerId: createLayerId("layer-a"),
      startTick: toTick(0),
      durationTicks: toTick(900),
    });

    registry.add(item);
    expect(registry.has(item.id)).toBe(true);
    expect(registry.get(item.id)).toBe(item);
    expect(registry.getAll()).toEqual([item]);

    registry.remove(item.id);
    expect(registry.has(item.id)).toBe(false);
  });

  it("add throws on a duplicate id", () => {
    const registry = new TrackItemRegistry();
    const item = createTrackItem({
      id: createTrackItemId("a"),
      trackId: createTrackId("v1"),
      layerId: createLayerId("layer-a"),
      startTick: toTick(0),
      durationTicks: toTick(900),
    });
    registry.add(item);
    expect(() => registry.add(item)).toThrow(/already registered/);
  });

  it("remove throws on an unknown id", () => {
    const registry = new TrackItemRegistry();
    expect(() => registry.remove(createTrackItemId("missing"))).toThrow(/unknown track item/);
  });
});
