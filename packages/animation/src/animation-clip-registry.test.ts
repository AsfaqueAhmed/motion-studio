import { createAnimationClipId, createLayerId, LayerType } from "@motion-studio/shared";
import { describe, expect, it } from "vitest";
import { AnimationClipRegistry } from "./animation-clip-registry";
import { createAnimationClip } from "./animation-factory";

describe("AnimationClipRegistry", () => {
  it("adds and retrieves a clip by id", () => {
    const registry = new AnimationClipRegistry();
    const clip = createAnimationClip({
      id: createAnimationClipId("clip-a"),
      layerId: createLayerId("layer-a"),
      layerType: LayerType.Text,
      name: "Fade In",
    });
    registry.add(clip);
    expect(registry.get(clip.id)).toBe(clip);
    expect(registry.has(clip.id)).toBe(true);
  });

  it("throws when adding a duplicate id", () => {
    const registry = new AnimationClipRegistry();
    const clip = createAnimationClip({
      id: createAnimationClipId("clip-a"),
      layerId: createLayerId("layer-a"),
      layerType: LayerType.Text,
      name: "Fade In",
    });
    registry.add(clip);
    expect(() => registry.add(clip)).toThrow(/already registered/);
  });

  it("throws when removing an unknown id", () => {
    const registry = new AnimationClipRegistry();
    expect(() => registry.remove(createAnimationClipId("missing"))).toThrow(/unknown clip/);
  });

  it("clear empties the registry", () => {
    const registry = new AnimationClipRegistry();
    registry.add(
      createAnimationClip({
        id: createAnimationClipId("clip-a"),
        layerId: createLayerId("layer-a"),
        layerType: LayerType.Text,
        name: "Fade In",
      }),
    );
    registry.clear();
    expect(registry.getAll()).toEqual([]);
  });
});
