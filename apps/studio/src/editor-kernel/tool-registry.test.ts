import { describe, expect, it } from "vitest";
import { ToolRegistry } from "./tool-registry";

describe("ToolRegistry", () => {
  it("registers a tool and activates it", () => {
    const registry = new ToolRegistry();
    let activated = false;
    registry.registerTool(
      { id: "select", name: "Select", icon: "cursor", category: "selection" },
      () => ({ activate: () => (activated = true), deactivate: () => {}, cancel: () => {} }),
    );

    registry.activate("select");

    expect(activated).toBe(true);
    expect(registry.activeTool).toBe("select");
  });

  it("throws activating an unknown tool", () => {
    const registry = new ToolRegistry();
    expect(() => registry.activate("nope")).toThrow(/unknown tool/);
  });

  it("clears the active tool when it is unregistered", () => {
    const registry = new ToolRegistry();
    registry.registerTool(
      { id: "select", name: "Select", icon: "cursor", category: "selection" },
      () => ({
        activate: () => {},
        deactivate: () => {},
        cancel: () => {},
      }),
    );
    registry.activate("select");

    registry.unregisterTool("select");

    expect(registry.activeTool).toBeUndefined();
    expect(registry.list()).toHaveLength(0);
  });
});
