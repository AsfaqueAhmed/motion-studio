import { describe, expect, it } from "vitest";
import { Container, createToken } from "./container";

describe("Container", () => {
  it("resolves a registered factory", () => {
    const container = new Container();
    const token = createToken<number>("answer");
    container.register(token, () => 42);

    expect(container.resolve(token)).toBe(42);
  });

  it("caches the resolved instance (singleton by default)", () => {
    const container = new Container();
    const token = createToken<{ id: number }>("thing");
    let calls = 0;
    container.register(token, () => ({ id: ++calls }));

    const first = container.resolve(token);
    const second = container.resolve(token);

    expect(first).toBe(second);
    expect(calls).toBe(1);
  });

  it("supports constructor injection by resolving dependencies inside a factory", () => {
    const container = new Container();
    const depToken = createToken<string>("dep");
    const rootToken = createToken<string>("root");

    container.register(depToken, () => "hello");
    container.register(rootToken, (c) => `${c.resolve(depToken)} world`);

    expect(container.resolve(rootToken)).toBe("hello world");
  });

  it("re-registering a token clears the previously cached instance", () => {
    const container = new Container();
    const token = createToken<number>("value");
    container.register(token, () => 1);
    expect(container.resolve(token)).toBe(1);

    container.register(token, () => 2);
    expect(container.resolve(token)).toBe(2);
  });

  it("throws when resolving an unregistered token", () => {
    const container = new Container();
    const token = createToken<number>("missing");

    expect(() => container.resolve(token)).toThrow(/No registration found/);
  });

  it("has() reflects registration state", () => {
    const container = new Container();
    const token = createToken<number>("x");

    expect(container.has(token)).toBe(false);
    container.register(token, () => 1);
    expect(container.has(token)).toBe(true);
  });
});
