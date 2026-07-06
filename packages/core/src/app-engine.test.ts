import type { IEngine } from "@motion-studio/shared";
import { describe, expect, it } from "vitest";
import { AppEngine } from "./app-engine";
import { EngineLifecycleState } from "./lifecycle";
import { WorkerSlot } from "./worker-manager";

function recordingEngine(name: string, log: string[]): IEngine {
  return {
    name,
    initialize: () => {
      log.push(`${name}:initialize`);
    },
    ready: () => {
      log.push(`${name}:ready`);
    },
    dispose: () => {
      log.push(`${name}:dispose`);
    },
  };
}

describe("AppEngine", () => {
  it("initializes every engine before readying any of them, in registration order", async () => {
    const log: string[] = [];
    const app = new AppEngine();
    app.registerEngine(recordingEngine("Core", log));
    app.registerEngine(recordingEngine("Storage", log));

    await app.start();

    expect(log).toEqual(["Core:initialize", "Storage:initialize", "Core:ready", "Storage:ready"]);
  });

  it("marks engines Ready after start()", async () => {
    const app = new AppEngine();
    app.registerEngine(recordingEngine("Core", []));

    await app.start();

    expect(app.services.getState("Core")).toBe(EngineLifecycleState.Ready);
  });

  it("disposes engines in reverse registration order on shutdown", async () => {
    const log: string[] = [];
    const app = new AppEngine();
    app.registerEngine(recordingEngine("Core", log));
    app.registerEngine(recordingEngine("Storage", log));

    await app.start();
    log.length = 0;
    await app.shutdown();

    expect(log).toEqual(["Storage:dispose", "Core:dispose"]);
    expect(app.services.getState("Storage")).toBe(EngineLifecycleState.Disposed);
  });

  it("refuses to register new engines after start()", async () => {
    const app = new AppEngine();
    app.registerEngine(recordingEngine("Core", []));
    await app.start();

    expect(() => app.registerEngine(recordingEngine("Late", []))).toThrow(
      /after AppEngine has started/,
    );
  });

  it("terminates all workers on shutdown", async () => {
    const app = new AppEngine();
    let terminated = false;
    app.workers.registerFactory(WorkerSlot.Rendering, () => ({
      postMessage: () => {},
      terminate: () => {
        terminated = true;
      },
      addEventListener: () => {},
      removeEventListener: () => {},
    }));
    app.workers.postMessage(WorkerSlot.Rendering, { hello: true });

    await app.shutdown();

    expect(terminated).toBe(true);
  });
});
