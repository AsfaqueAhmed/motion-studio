import { describe, expect, it, vi } from "vitest";
import { EventBus } from "./event-bus";

describe("EventBus", () => {
  it("delivers emitted events synchronously to subscribers", () => {
    const bus = new EventBus();
    const listener = vi.fn();
    bus.on("PlaybackStopped", listener);

    bus.emit("PlaybackStopped", {});

    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener.mock.calls[0]?.[0]).toMatchObject({
      type: "PlaybackStopped",
      payload: {},
    });
  });

  it("stops delivering events after unsubscribe", () => {
    const bus = new EventBus();
    const listener = vi.fn();
    const unsubscribe = bus.on("PlaybackStopped", listener);

    unsubscribe();
    bus.emit("PlaybackStopped", {});

    expect(listener).not.toHaveBeenCalled();
  });

  it("off() removes a specific listener without affecting others", () => {
    const bus = new EventBus();
    const a = vi.fn();
    const b = vi.fn();
    bus.on("PlaybackStopped", a);
    bus.on("PlaybackStopped", b);

    bus.off("PlaybackStopped", a);
    bus.emit("PlaybackStopped", {});

    expect(a).not.toHaveBeenCalled();
    expect(b).toHaveBeenCalledTimes(1);
  });

  it("isolates a throwing listener so other listeners still run", () => {
    const bus = new EventBus();
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const good = vi.fn();
    bus.on("PlaybackStopped", () => {
      throw new Error("boom");
    });
    bus.on("PlaybackStopped", good);

    expect(() => bus.emit("PlaybackStopped", {})).not.toThrow();
    expect(good).toHaveBeenCalledTimes(1);
    expect(errorSpy).toHaveBeenCalled();

    errorSpy.mockRestore();
  });

  it("emitAsync awaits every async listener before resolving", async () => {
    const bus = new EventBus();
    const order: string[] = [];
    bus.on("PlaybackStopped", async () => {
      await new Promise((resolve) => setTimeout(resolve, 5));
      order.push("slow");
    });
    bus.on("PlaybackStopped", () => {
      order.push("fast");
    });

    await bus.emitAsync("PlaybackStopped", {});

    expect(order).toContain("slow");
    expect(order).toContain("fast");
  });

  it("emitAsync reports a rejected listener without throwing", async () => {
    const bus = new EventBus();
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    bus.on("PlaybackStopped", async () => {
      throw new Error("async boom");
    });

    await expect(bus.emitAsync("PlaybackStopped", {})).resolves.toBeUndefined();
    expect(errorSpy).toHaveBeenCalled();

    errorSpy.mockRestore();
  });

  it("only delivers events to listeners of the matching type", () => {
    const bus = new EventBus();
    const stopped = vi.fn();
    const paused = vi.fn();
    bus.on("PlaybackStopped", stopped);
    bus.on("PlaybackPaused", paused);

    bus.emit("PlaybackStopped", {});

    expect(stopped).toHaveBeenCalledTimes(1);
    expect(paused).not.toHaveBeenCalled();
  });
});
