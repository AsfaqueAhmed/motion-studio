import type { ICommand } from "@motion-studio/shared";
import { HistoryEngine } from "@motion-studio/history";
import { describe, expect, it } from "vitest";
import { CommandBus } from "./command-bus";

function fakeCommand(log: string[]): ICommand {
  return {
    id: "cmd-1",
    label: "Fake",
    execute: () => log.push("execute"),
    undo: () => log.push("undo"),
    redo: () => log.push("redo"),
  };
}

describe("CommandBus", () => {
  it("executes a command through the History Engine", () => {
    const log: string[] = [];
    const bus = new CommandBus(new HistoryEngine());
    bus.execute(fakeCommand(log));
    expect(log).toEqual(["execute"]);
    expect(bus.canUndo).toBe(true);
    expect(bus.canRedo).toBe(false);
  });

  it("undoes and redoes through the same stack", () => {
    const log: string[] = [];
    const bus = new CommandBus(new HistoryEngine());
    bus.execute(fakeCommand(log));

    bus.undo();
    expect(log).toEqual(["execute", "undo"]);
    expect(bus.canRedo).toBe(true);

    bus.redo();
    expect(log).toEqual(["execute", "undo", "redo"]);
  });
});
