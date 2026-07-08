import { createCompositionId, toTick } from "@motion-studio/shared";
import { describe, expect, it } from "vitest";
import { createComposition } from "../timeline-factory";
import { TimelineEngine } from "../timeline-engine";
import { UpdateCompositionSizeCommand } from "./update-composition-size-command";

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
  return { engine, composition };
}

describe("UpdateCompositionSizeCommand", () => {
  it("execute changes the frame size; undo restores the original", () => {
    const { engine, composition } = setup();
    const command = new UpdateCompositionSizeCommand("cmd-1", engine, composition.id, 1080, 1920);

    command.execute();
    expect(engine.requireComposition(composition.id)).toMatchObject({ width: 1080, height: 1920 });

    command.undo();
    expect(engine.requireComposition(composition.id)).toMatchObject({ width: 1920, height: 1080 });

    command.redo();
    expect(engine.requireComposition(composition.id)).toMatchObject({ width: 1080, height: 1920 });
  });

  it("undo throws if called before execute", () => {
    const { engine, composition } = setup();
    const command = new UpdateCompositionSizeCommand("cmd-1", engine, composition.id, 1080, 1920);
    expect(() => command.undo()).toThrow(/cannot undo before execute/);
  });
});
