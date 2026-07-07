import { createLayerId } from "@motion-studio/shared";
import { LayerEngine, createTextLayer } from "@motion-studio/layer";
import { describe, expect, it } from "vitest";
import { UpdateLayerCommand } from "./update-layer-command";

function setup() {
  const engine = new LayerEngine();
  const layer = createTextLayer({
    id: createLayerId("layer-a"),
    name: "Title",
    content: "Hello",
  });
  engine.compositionGraph.addLayer(layer);
  return { engine, layer };
}

describe("UpdateLayerCommand", () => {
  it("execute sets the property; undo restores the previous value; redo re-applies it", () => {
    const { engine, layer } = setup();
    const command = new UpdateLayerCommand("cmd-1", engine, layer.id, "opacity", 0.5);

    command.execute();
    expect(engine.registry.get(layer.id)?.opacity).toBe(0.5);

    command.undo();
    expect(engine.registry.get(layer.id)?.opacity).toBe(layer.opacity);

    command.redo();
    expect(engine.registry.get(layer.id)?.opacity).toBe(0.5);
  });

  it("does not recapture the previous value on redo (captures only on execute)", () => {
    const { engine, layer } = setup();
    const originalOpacity = layer.opacity;
    const command = new UpdateLayerCommand("cmd-1", engine, layer.id, "opacity", 0.5);

    command.execute();
    // Simulate an external mutation between execute and undo/redo — the
    // command must still restore/reapply relative to its own captured
    // snapshot, not whatever the property happens to hold right now.
    engine.registry.get(layer.id)!.opacity = 0.9;

    command.undo();
    expect(engine.registry.get(layer.id)?.opacity).toBe(originalOpacity);

    command.redo();
    expect(engine.registry.get(layer.id)?.opacity).toBe(0.5);
  });
});
