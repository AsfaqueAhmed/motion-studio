import { createCompositionId, createProjectId, toTick } from "@motion-studio/shared";
import { beforeEach, describe, expect, it } from "vitest";
import { PROJECT_SCHEMA_VERSION, type IProjectFileV1 } from "./project-schema";
import { ProjectRepository } from "./project-repository";
import { StorageEngine } from "./storage-engine";

/**
 * PLAN.md 16.2 — unlike `project-repository.test.ts` (in-memory VFS, Node),
 * this drives `ProjectRepository` through a real `StorageEngine`, which
 * means real `indexedDB` as provided by the browser this Vitest browser-mode
 * run is executing in (see `vitest.integration.config.ts`), not
 * `fake-indexeddb`. Confirms the real IndexedDB implementation actually
 * honors the read/write/list/delete contract `IStorageAdapter` assumes.
 */
function fixtureProject(id: string): IProjectFileV1 {
  return {
    schemaVersion: PROJECT_SCHEMA_VERSION,
    id: createProjectId(id),
    name: "Real Browser Project",
    createdAt: 0,
    updatedAt: 0,
    composition: {
      id: createCompositionId("comp-1"),
      name: "Main",
      width: 1920,
      height: 1080,
      fps: 30,
      tickResolution: 30,
      durationTicks: toTick(0),
      tracks: [],
    },
    layers: {},
  };
}

describe("ProjectRepository against a real StorageEngine (real IndexedDB)", () => {
  let repo: ProjectRepository;

  beforeEach(() => {
    // Real StorageEngine, real IndexedDBAdapter/OpfsAdapter (no injected fakes) —
    // "projects/" routes to IndexedDB per storage-engine.ts's directory table.
    repo = new ProjectRepository(new StorageEngine());
  });

  it("load() returns undefined for a project that was never saved", async () => {
    await expect(
      repo.load(createProjectId(`missing-${crypto.randomUUID()}`)),
    ).resolves.toBeUndefined();
  });

  it("save() then load() round-trips a project through real IndexedDB", async () => {
    const project = fixtureProject(`p-${crypto.randomUUID()}`);

    await repo.save(project);
    const loaded = await repo.load(project.id);

    expect(loaded).toEqual(project);
  });

  it("delete() removes a project that a fresh repository instance can no longer load", async () => {
    const project = fixtureProject(`p-${crypto.randomUUID()}`);
    await repo.save(project);

    await repo.delete(project.id);

    // Fresh instance: proves persistence/removal happened in real IndexedDB
    // itself, not in some in-memory cache on `repo`.
    const freshRepo = new ProjectRepository(new StorageEngine());
    await expect(freshRepo.load(project.id)).resolves.toBeUndefined();
  });
});
