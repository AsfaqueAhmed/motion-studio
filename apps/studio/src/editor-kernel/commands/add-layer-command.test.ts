import { createLayerId } from "@motion-studio/shared";
import { LayerEngine, createTextLayer } from "@motion-studio/layer";
import { describe, expect, it } from "vitest";
import { AddLayerCommand } from "./add-layer-command";

function setup() {
  const engine = new LayerEngine();
  const layer = createTextLayer({
    id: createLayerId("layer-a"),
    name: "Title",
    content: "Hello",
  });
  return { engine, layer };
}

describe("AddLayerCommand", () => {
  it("execute adds the layer; undo removes it; redo re-adds it", () => {
    const { engine, layer } = setup();
    const command = new AddLayerCommand("cmd-1", engine, layer);

    command.execute();
    expect(engine.registry.get(layer.id)).toEqual(layer);

    command.undo();
    expect(engine.registry.has(layer.id)).toBe(false);

    command.redo();
    expect(engine.registry.get(layer.id)).toEqual(layer);
  });
});
