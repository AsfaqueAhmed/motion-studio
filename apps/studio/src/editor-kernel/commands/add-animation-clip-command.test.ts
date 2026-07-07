import { LayerType, createAnimationClipId, createLayerId } from "@motion-studio/shared";
import { AnimationEngine, createAnimationClip } from "@motion-studio/animation";
import { describe, expect, it } from "vitest";
import { AddAnimationClipCommand } from "./add-animation-clip-command";

function setup() {
  const engine = new AnimationEngine();
  engine.initialize();
  const clip = createAnimationClip({
    id: createAnimationClipId("clip-a"),
    layerId: createLayerId("layer-a"),
    layerType: LayerType.Text,
    name: "Fade In",
  });
  return { engine, clip };
}

describe("AddAnimationClipCommand", () => {
  it("execute adds the clip; undo removes it; redo re-adds it", () => {
    const { engine, clip } = setup();
    const command = new AddAnimationClipCommand("cmd-1", engine, clip);

    command.execute();
    expect(engine.requireClip(clip.id)).toEqual(clip);

    command.undo();
    expect(engine.clips.has(clip.id)).toBe(false);

    command.redo();
    expect(engine.requireClip(clip.id)).toEqual(clip);
  });
});
