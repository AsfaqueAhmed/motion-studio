export type Migration = (data: Record<string, unknown>) => Record<string, unknown>;

function versionOf(data: Record<string, unknown>): number {
  const version = data["schemaVersion"];
  if (typeof version !== "number") {
    throw new Error("Project file is missing a numeric schemaVersion.");
  }
  return version;
}

/**
 * Runs versioned migrations in sequence from a project's stored
 * `schemaVersion` up to `currentVersion`. Registering a migration does not
 * make it safe on its own — see "Migration failure/rollback" in
 * docs/12-storage/overview.md: callers (ProjectRepository) must back up the
 * pre-migration file before calling migrate(), since this is a local-only
 * app with no other copy to fall back to.
 */
export class MigrationRunner {
  private readonly migrations = new Map<number, Migration>();

  constructor(private readonly currentVersion: number) {}

  /** Registers the migration that takes a project from `fromVersion` to `fromVersion + 1`. */
  register(fromVersion: number, migrate: Migration): void {
    this.migrations.set(fromVersion, migrate);
  }

  migrate(data: Record<string, unknown>): Record<string, unknown> {
    let current = data;
    let version = versionOf(current);
    if (version > this.currentVersion) {
      throw new Error(
        `Project schema version ${version} is newer than this app supports (current: ${this.currentVersion}). Refusing to load — update the app first.`,
      );
    }
    while (version < this.currentVersion) {
      const migration = this.migrations.get(version);
      if (!migration) {
        throw new Error(
          `No migration registered to move project schema from version ${version} to ${version + 1}.`,
        );
      }
      current = migration(current);
      const nextVersion = versionOf(current);
      if (nextVersion <= version) {
        throw new Error(
          `Migration from version ${version} did not advance schemaVersion (got ${nextVersion}) — refusing to loop forever.`,
        );
      }
      version = nextVersion;
    }
    return current;
  }
}
