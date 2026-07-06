import { createCompositionId, toTick } from "@motion-studio/shared";
import { describe, expect, it } from "vitest";
import { CompositionRegistry } from "./composition-registry";
import { createComposition } from "./timeline-factory";

describe("CompositionRegistry", () => {
  it("add/get/has/remove round-trips a composition", () => {
    const registry = new CompositionRegistry();
    const composition = createComposition({
      id: createCompositionId("a"),
      name: "Main",
      width: 1920,
      height: 1080,
      fps: 30,
      durationTicks: toTick(9000),
    });

    registry.add(composition);
    expect(registry.has(composition.id)).toBe(true);
    expect(registry.get(composition.id)).toBe(composition);
    expect(registry.getAll()).toEqual([composition]);

    registry.remove(composition.id);
    expect(registry.has(composition.id)).toBe(false);
  });

  it("add throws on a duplicate id", () => {
    const registry = new CompositionRegistry();
    const composition = createComposition({
      id: createCompositionId("a"),
      name: "Main",
      width: 1920,
      height: 1080,
      fps: 30,
      durationTicks: toTick(9000),
    });
    registry.add(composition);
    expect(() => registry.add(composition)).toThrow(/already registered/);
  });

  it("remove throws on an unknown id", () => {
    const registry = new CompositionRegistry();
    expect(() => registry.remove(createCompositionId("missing"))).toThrow(/unknown composition/);
  });
});
