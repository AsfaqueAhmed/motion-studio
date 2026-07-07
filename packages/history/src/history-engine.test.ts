import type { ICommand } from "@motion-studio/shared";
import { describe, expect, it, vi } from "vitest";
import { HistoryEngine } from "./history-engine";

function fakeCommand(id: string): { command: ICommand; calls: string[] } {
  const calls: string[] = [];
  const command: ICommand = {
    id,
    label: `Command ${id}`,
    execute: () => calls.push("execute"),
    undo: () => calls.push("undo"),
    redo: () => calls.push("redo"),
  };
  return { command, calls };
}

describe("HistoryEngine", () => {
  it("execute runs the command and makes it undoable", () => {
    const engine = new HistoryEngine();
    const { command, calls } = fakeCommand("a");

    engine.execute(command);

    expect(calls).toEqual(["execute"]);
    expect(engine.canUndo).toBe(true);
    expect(engine.canRedo).toBe(false);
  });

  it("undo then redo replay the command via undo()/redo(), not execute()", () => {
    const engine = new HistoryEngine();
    const { command, calls } = fakeCommand("a");

    engine.execute(command);
    engine.undo();
    expect(calls).toEqual(["execute", "undo"]);
    expect(engine.canUndo).toBe(false);
    expect(engine.canRedo).toBe(true);

    engine.redo();
    expect(calls).toEqual(["execute", "undo", "redo"]);
    expect(engine.canUndo).toBe(true);
    expect(engine.canRedo).toBe(false);
  });

  it("a new execute() clears the redo stack", () => {
    const engine = new HistoryEngine();
    const { command: a } = fakeCommand("a");
    const { command: b } = fakeCommand("b");

    engine.execute(a);
    engine.undo();
    expect(engine.canRedo).toBe(true);

    engine.execute(b);
    expect(engine.canRedo).toBe(false);
  });

  it("undo on an empty stack throws", () => {
    const engine = new HistoryEngine();
    expect(() => engine.undo()).toThrow(/nothing to undo/);
  });

  it("redo on an empty stack throws", () => {
    const engine = new HistoryEngine();
    expect(() => engine.redo()).toThrow(/nothing to redo/);
  });

  it("drops the oldest entry once maxDepth is exceeded", () => {
    const engine = new HistoryEngine({ maxDepth: 2 });
    const { command: a } = fakeCommand("a");
    const { command: b } = fakeCommand("b");
    const { command: c } = fakeCommand("c");

    engine.execute(a);
    engine.execute(b);
    engine.execute(c);

    expect(engine.undoLabels).toEqual(["Command b", "Command c"]);
  });

  it("clear() drops both stacks (History cleared on project load)", () => {
    const engine = new HistoryEngine();
    const { command } = fakeCommand("a");

    engine.execute(command);
    engine.undo();
    expect(engine.canRedo).toBe(true);

    engine.clear();
    expect(engine.canUndo).toBe(false);
    expect(engine.canRedo).toBe(false);
  });

  it("emits CommandExecuted / CommandUndone / CommandRedone through the injected sink", () => {
    const emit = vi.fn();
    const engine = new HistoryEngine({ events: { emit } });
    const { command } = fakeCommand("a");

    engine.execute(command);
    engine.undo();
    engine.redo();

    expect(emit).toHaveBeenNthCalledWith(1, "CommandExecuted", { commandId: "a" });
    expect(emit).toHaveBeenNthCalledWith(2, "CommandUndone", { commandId: "a" });
    expect(emit).toHaveBeenNthCalledWith(3, "CommandRedone", { commandId: "a" });
  });

  it("dispose() clears the stacks", () => {
    const engine = new HistoryEngine();
    const { command } = fakeCommand("a");
    engine.execute(command);

    engine.dispose();

    expect(engine.canUndo).toBe(false);
  });
});
