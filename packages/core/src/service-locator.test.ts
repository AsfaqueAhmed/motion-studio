import type { IEngine } from "@motion-studio/shared";
import { describe, expect, it } from "vitest";
import { EngineLifecycleState } from "./lifecycle";
import { ServiceLocator } from "./service-locator";

function fakeEngine(name: string): IEngine {
  return {
    name,
    initialize: () => {},
    ready: () => {},
    dispose: () => {},
  };
}

describe("ServiceLocator", () => {
  it("registers and resolves an engine by name", () => {
    const locator = new ServiceLocator();
    const engine = fakeEngine("Storage");

    locator.register(engine);

    expect(locator.get("Storage")).toBe(engine);
    expect(locator.has("Storage")).toBe(true);
  });

  it("throws on duplicate registration", () => {
    const locator = new ServiceLocator();
    locator.register(fakeEngine("Storage"));

    expect(() => locator.register(fakeEngine("Storage"))).toThrow(/already registered/);
  });

  it("throws when resolving an unregistered engine", () => {
    const locator = new ServiceLocator();

    expect(() => locator.get("Missing")).toThrow(/No engine registered/);
  });

  it("tracks lifecycle state transitions, defaulting to Unregistered", () => {
    const locator = new ServiceLocator();

    expect(locator.getState("Storage")).toBe(EngineLifecycleState.Unregistered);

    locator.register(fakeEngine("Storage"));
    expect(locator.getState("Storage")).toBe(EngineLifecycleState.Registered);

    locator.setState("Storage", EngineLifecycleState.Ready);
    expect(locator.getState("Storage")).toBe(EngineLifecycleState.Ready);
  });

  it("throws when setting state for an unregistered engine", () => {
    const locator = new ServiceLocator();

    expect(() => locator.setState("Storage", EngineLifecycleState.Ready)).toThrow(/unregistered/);
  });

  it("lists registered engine names", () => {
    const locator = new ServiceLocator();
    locator.register(fakeEngine("Storage"));
    locator.register(fakeEngine("Timeline"));

    expect(locator.names()).toEqual(["Storage", "Timeline"]);
  });
});
