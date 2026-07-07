import type { ICommand } from "@motion-studio/shared";
import { describe, expect, it } from "vitest";
import { CompositeCommand } from "./composite-command";

function fakeCommand(id: string, log: string[]): ICommand {
  return {
    id,
    label: `Command ${id}`,
    execute: () => log.push(`execute:${id}`),
    undo: () => log.push(`undo:${id}`),
    redo: () => log.push(`redo:${id}`),
  };
}

describe("CompositeCommand", () => {
  it("execute() runs sub-commands in order", () => {
    const log: string[] = [];
    const composite = new CompositeCommand("cmd-1", "Move + resize", [
      fakeCommand("a", log),
      fakeCommand("b", log),
    ]);

    composite.execute();

    expect(log).toEqual(["execute:a", "execute:b"]);
  });

  it("undo() runs sub-commands in reverse order", () => {
    const log: string[] = [];
    const composite = new CompositeCommand("cmd-1", "Move + resize", [
      fakeCommand("a", log),
      fakeCommand("b", log),
    ]);

    composite.execute();
    log.length = 0;
    composite.undo();

    expect(log).toEqual(["undo:b", "undo:a"]);
  });

  it("redo() runs sub-commands in forward order", () => {
    const log: string[] = [];
    const composite = new CompositeCommand("cmd-1", "Move + resize", [
      fakeCommand("a", log),
      fakeCommand("b", log),
    ]);

    composite.execute();
    composite.undo();
    log.length = 0;
    composite.redo();

    expect(log).toEqual(["redo:a", "redo:b"]);
  });
});
