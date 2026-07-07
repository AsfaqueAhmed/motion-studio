import { describe, expect, it } from "vitest";
import { ShortcutService } from "./shortcut-service";

describe("ShortcutService", () => {
  it("resolves a plain key binding", () => {
    const service = new ShortcutService();
    service.register({ key: "V", commandId: "ActivateSelectTool", scope: "Global" });

    const commandId = service.resolve({
      key: "v",
      ctrlKey: false,
      metaKey: false,
      shiftKey: false,
      altKey: false,
    });

    expect(commandId).toBe("ActivateSelectTool");
  });

  it("resolves a modifier chord", () => {
    const service = new ShortcutService();
    service.register({ key: "Mod+Shift+Z", commandId: "Redo", scope: "Global" });

    const commandId = service.resolve({
      key: "z",
      ctrlKey: true,
      metaKey: false,
      shiftKey: true,
      altKey: false,
    });

    expect(commandId).toBe("Redo");
  });

  it("returns undefined for an unbound key", () => {
    const service = new ShortcutService();
    expect(
      service.resolve({ key: "x", ctrlKey: false, metaKey: false, shiftKey: false, altKey: false }),
    ).toBeUndefined();
  });

  it("throws on registering a duplicate binding in the same scope", () => {
    const service = new ShortcutService();
    service.register({ key: "Delete", commandId: "DeleteSelection", scope: "Global" });

    expect(() => service.register({ key: "Delete", commandId: "Other", scope: "Global" })).toThrow(
      /already bound/,
    );
  });

  it("allows unregistering then re-registering the same binding", () => {
    const service = new ShortcutService();
    service.register({ key: "Delete", commandId: "DeleteSelection", scope: "Global" });
    service.unregister("Delete", "Global");

    expect(() =>
      service.register({ key: "Delete", commandId: "Other", scope: "Global" }),
    ).not.toThrow();
  });
});
