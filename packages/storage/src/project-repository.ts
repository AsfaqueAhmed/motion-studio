import { createProjectId, type ProjectId } from "@motion-studio/shared";
import { decodeJson, encodeJson } from "./json-codec";
import { MigrationRunner } from "./migration";
import { PROJECT_SCHEMA_VERSION, type IProjectFileV1 } from "./project-schema";
import type { IVFS } from "./vfs";

const PROJECTS_DIR = "projects";
const BACKUPS_DIR = "projects/backups";
const PROJECT_PATH_PATTERN = /^projects\/([^/]+)\.json$/;

function projectPath(id: ProjectId): string {
  return `${PROJECTS_DIR}/${id}.json`;
}

/**
 * Owns project JSON persistence. See docs/12-storage/project-schema.md.
 * Loading a project stored on an older schema version writes a full backup
 * before running any migration, so a bad migration can't destroy the only
 * copy of a local-only project — see the open risk in
 * docs/12-storage/overview.md.
 */
export class ProjectRepository {
  constructor(
    private readonly vfs: IVFS,
    private readonly migrations: MigrationRunner = new MigrationRunner(PROJECT_SCHEMA_VERSION),
  ) {}

  async save(project: IProjectFileV1): Promise<void> {
    await this.vfs.write(projectPath(project.id), encodeJson(project));
  }

  async load(projectId: ProjectId): Promise<IProjectFileV1 | undefined> {
    const data = await this.vfs.read(projectPath(projectId));
    if (!data) {
      return undefined;
    }
    const raw = decodeJson<Record<string, unknown>>(data);
    const version = raw["schemaVersion"];
    if (typeof version !== "number") {
      throw new Error(`Project "${projectId}" is missing a numeric schemaVersion.`);
    }
    if (version === PROJECT_SCHEMA_VERSION) {
      return raw as unknown as IProjectFileV1;
    }
    await this.backup(projectId, data, version);
    const migrated = this.migrations.migrate(raw) as unknown as IProjectFileV1;
    await this.save(migrated);
    return migrated;
  }

  async list(): Promise<ProjectId[]> {
    const paths = await this.vfs.list(`${PROJECTS_DIR}/`);
    const ids: ProjectId[] = [];
    for (const path of paths) {
      const match = PROJECT_PATH_PATTERN.exec(path);
      const id = match?.[1];
      if (id) {
        ids.push(createProjectId(id));
      }
    }
    return ids;
  }

  async delete(projectId: ProjectId): Promise<void> {
    await this.vfs.delete(projectPath(projectId));
  }

  private async backup(projectId: ProjectId, data: Uint8Array, version: number): Promise<void> {
    await this.vfs.write(`${BACKUPS_DIR}/${projectId}.v${version}.${Date.now()}.json`, data);
  }
}
