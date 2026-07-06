import { createCompositionId, createProjectId, toTick } from "@motion-studio/shared";
import { beforeEach, describe, expect, it } from "vitest";
import { MigrationRunner } from "./migration";
import { PROJECT_SCHEMA_VERSION, type IProjectFileV1 } from "./project-schema";
import { ProjectRepository } from "./project-repository";
import { createInMemoryVfs } from "./test-support/in-memory-vfs";
import type { IVFS } from "./vfs";

function fixtureProject(id: string): IProjectFileV1 {
  return {
    schemaVersion: PROJECT_SCHEMA_VERSION,
    id: createProjectId(id),
    name: "My Project",
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

describe("ProjectRepository", () => {
  let vfs: IVFS;
  let repo: ProjectRepository;

  beforeEach(() => {
    vfs = createInMemoryVfs();
    repo = new ProjectRepository(vfs);
  });

  it("load() returns undefined for a project that was never saved", async () => {
    await expect(repo.load(createProjectId("missing"))).resolves.toBeUndefined();
  });

  it("save() then load() round-trips a current-schema project", async () => {
    const project = fixtureProject("p1");
    await repo.save(project);

    await expect(repo.load(project.id)).resolves.toEqual(project);
  });

  it("delete() removes a saved project", async () => {
    const project = fixtureProject("p1");
    await repo.save(project);
    await repo.delete(project.id);

    await expect(repo.load(project.id)).resolves.toBeUndefined();
  });

  it("list() returns the ids of every saved project, excluding backups", async () => {
    await repo.save(fixtureProject("p1"));
    await repo.save(fixtureProject("p2"));
    await vfs.write("projects/backups/p1.v0.123.json", new TextEncoder().encode("{}"));

    const ids = await repo.list();

    expect(ids.sort()).toEqual(["p1", "p2"]);
  });

  it("backs up and migrates a project stored on an older schema version", async () => {
    const legacyPath = "projects/p1.json";
    const legacy = { schemaVersion: 0, id: "p1", oldName: "Legacy Project" };
    await vfs.write(legacyPath, new TextEncoder().encode(JSON.stringify(legacy)));

    const migrations = new MigrationRunner(PROJECT_SCHEMA_VERSION);
    migrations.register(0, (data) => ({
      ...data,
      schemaVersion: 1,
      name: data["oldName"],
      createdAt: 0,
      updatedAt: 0,
      composition: {
        id: "comp-1",
        name: "Main",
        width: 1920,
        height: 1080,
        fps: 30,
        tickResolution: 30,
        durationTicks: 0,
        tracks: [],
      },
      layers: {},
    }));
    repo = new ProjectRepository(vfs, migrations);

    const migrated = await repo.load(createProjectId("p1"));

    expect(migrated?.schemaVersion).toBe(1);
    expect(migrated?.name).toBe("Legacy Project");

    const backupPaths = await vfs.list("projects/backups/");
    expect(backupPaths).toHaveLength(1);
    const backupData = await vfs.read(backupPaths[0] as string);
    expect(JSON.parse(new TextDecoder().decode(backupData))).toEqual(legacy);

    const resaved = await vfs.read(legacyPath);
    expect(JSON.parse(new TextDecoder().decode(resaved))["schemaVersion"]).toBe(1);
  });
});
