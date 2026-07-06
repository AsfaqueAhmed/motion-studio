import { describe, expect, it } from "vitest";
import { MigrationRunner } from "./migration";

describe("MigrationRunner", () => {
  it("returns data unchanged if it is already at the current version", () => {
    const runner = new MigrationRunner(1);
    const data = { schemaVersion: 1, name: "a" };

    expect(runner.migrate(data)).toEqual(data);
  });

  it("runs a single registered migration", () => {
    const runner = new MigrationRunner(2);
    runner.register(1, (data) => ({ ...data, schemaVersion: 2, addedField: true }));

    const result = runner.migrate({ schemaVersion: 1, name: "a" });

    expect(result).toEqual({ schemaVersion: 2, name: "a", addedField: true });
  });

  it("chains multiple migrations in order", () => {
    const runner = new MigrationRunner(3);
    runner.register(1, (data) => ({ ...data, schemaVersion: 2 }));
    runner.register(2, (data) => ({ ...data, schemaVersion: 3 }));

    const result = runner.migrate({ schemaVersion: 1 });

    expect(result["schemaVersion"]).toBe(3);
  });

  it("throws when a migration is missing for the stored version", () => {
    const runner = new MigrationRunner(2);

    expect(() => runner.migrate({ schemaVersion: 1 })).toThrow(/No migration registered/);
  });

  it("throws when schemaVersion is missing or not a number", () => {
    const runner = new MigrationRunner(1);

    expect(() => runner.migrate({})).toThrow(/missing a numeric schemaVersion/);
    expect(() => runner.migrate({ schemaVersion: "1" })).toThrow(/missing a numeric schemaVersion/);
  });

  it("throws when the stored version is newer than the app's current version", () => {
    const runner = new MigrationRunner(1);

    expect(() => runner.migrate({ schemaVersion: 2 })).toThrow(/newer than this app supports/);
  });

  it("throws instead of looping forever when a migration does not advance schemaVersion", () => {
    const runner = new MigrationRunner(2);
    runner.register(1, (data) => ({ ...data }));

    expect(() => runner.migrate({ schemaVersion: 1 })).toThrow(/did not advance schemaVersion/);
  });
});
