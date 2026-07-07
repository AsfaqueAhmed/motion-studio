import type { ICommand } from "@motion-studio/shared";
import { describe, expect, it } from "vitest";
import { LayoutHistoryStack } from "./layout-history";

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

describe("LayoutHistoryStack", () => {
  it("only remembers the single most recent layout change", () => {
    const stack = new LayoutHistoryStack();
    const { command: a } = fakeCommand("a");
    const { command: b } = fakeCommand("b");

    stack.execute(a);
    stack.execute(b);

    // "a" was pushed out — nothing tracks it anymore, only "b" is undoable.
    stack.undo();
    expect(stack.canUndo).toBe(false);
    expect(stack.canRedo).toBe(true);
  });

  it("undo then redo round-trips the single tracked command", () => {
    const stack = new LayoutHistoryStack();
    const { command, calls } = fakeCommand("a");

    stack.execute(command);
    stack.undo();
    stack.redo();

    expect(calls).toEqual(["execute", "undo", "redo"]);
  });

  it("undo on empty throws, redo on empty throws", () => {
    const stack = new LayoutHistoryStack();
    expect(() => stack.undo()).toThrow(/nothing to undo/);
    expect(() => stack.redo()).toThrow(/nothing to redo/);
  });

  it("a new execute() after undo discards the redo slot", () => {
    const stack = new LayoutHistoryStack();
    const { command: a } = fakeCommand("a");
    const { command: b } = fakeCommand("b");

    stack.execute(a);
    stack.undo();
    expect(stack.canRedo).toBe(true);

    stack.execute(b);
    expect(stack.canRedo).toBe(false);
  });

  it("clear() drops the tracked command", () => {
    const stack = new LayoutHistoryStack();
    const { command } = fakeCommand("a");
    stack.execute(command);

    stack.clear();

    expect(stack.canUndo).toBe(false);
  });
});
