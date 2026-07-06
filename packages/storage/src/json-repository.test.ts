import { beforeEach, describe, expect, it } from "vitest";
import { JsonRepository } from "./json-repository";
import { createInMemoryVfs } from "./test-support/in-memory-vfs";
import type { IVFS } from "./vfs";

interface IWidget {
  id: string;
  label: string;
}

class WidgetRepository extends JsonRepository<IWidget> {
  constructor(vfs: IVFS) {
    super(vfs, "widgets");
  }
}

describe("JsonRepository", () => {
  let repo: WidgetRepository;

  beforeEach(() => {
    repo = new WidgetRepository(createInMemoryVfs());
  });

  it("get() returns undefined for an item that was never created", async () => {
    await expect(repo.get("missing")).resolves.toBeUndefined();
  });

  it("create() then get() round-trips the item", async () => {
    await repo.create({ id: "a", label: "Alpha" });

    await expect(repo.get("a")).resolves.toEqual({ id: "a", label: "Alpha" });
  });

  it("update() overwrites the stored item", async () => {
    await repo.create({ id: "a", label: "Alpha" });
    await repo.update({ id: "a", label: "Renamed" });

    await expect(repo.get("a")).resolves.toEqual({ id: "a", label: "Renamed" });
  });

  it("delete() removes the item", async () => {
    await repo.create({ id: "a", label: "Alpha" });
    await repo.delete("a");

    await expect(repo.get("a")).resolves.toBeUndefined();
  });

  it("list() returns every stored item", async () => {
    await repo.create({ id: "a", label: "Alpha" });
    await repo.create({ id: "b", label: "Beta" });

    const items = await repo.list();

    expect(items.sort((x, y) => x.id.localeCompare(y.id))).toEqual([
      { id: "a", label: "Alpha" },
      { id: "b", label: "Beta" },
    ]);
  });
});
