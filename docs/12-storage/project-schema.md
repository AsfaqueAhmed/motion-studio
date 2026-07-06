# Project Schema

> Status: v1 implemented (Phase 3, 2026-07-06). See `packages/storage/src/project-schema.ts`, `migration.ts`, `project-repository.ts`.

Versioned project JSON schema and migration strategy.

## Schema v1 (`IProjectFileV1`)

```
{
  schemaVersion: 1,
  id, name, createdAt, updatedAt,
  composition: { id, name, width, height, fps, tickResolution, durationTicks, tracks: [...] },
  layers: Record<LayerId, ILayer>,
}
```

`composition.tracks[].items[]` (`IPersistedTrackItem`) hold `trackId`, `layerId`, `startTick`, `durationTicks`, `trimInTick`, `trimOutTick` — all integer Ticks, never floats, per `CLAUDE.md`.

**This is Storage's on-disk contract, not the Timeline Engine's runtime model.** Timeline (Phase 5) doesn't exist yet; `IPersistedComposition`/`IPersistedTrack`/`IPersistedTrackItem` are defined here because something has to specify what gets persisted before Timeline is built. When Phase 5 lands, Timeline is expected to map its runtime `Composition`/`Track`/`TrackItem` classes to and from this shape — if Timeline's runtime model ends up richer than what's persisted here, extend this schema (and bump the version) rather than letting Timeline invent a second, undocumented persisted shape.

## Migration runner

`MigrationRunner` (`migration.ts`) runs registered `fromVersion → fromVersion + 1` functions in sequence until the data reaches `PROJECT_SCHEMA_VERSION`. Two failure modes are guarded explicitly rather than left to produce silently-wrong results:

- **Stored version newer than the running app supports** (e.g. opening a project saved by a newer build) — throws immediately instead of returning unmigrated, schema-incompatible data.
- **A registered migration doesn't advance `schemaVersion`** — throws instead of looping forever.

## Migration failure/rollback — resolved (partially)

The open risk in `overview.md`/`DECISIONS.md`/`CLAUDE.md` ("failed migration = potential unrecoverable project loss") is addressed for the **backup half**: `ProjectRepository.load()` writes a full, untouched copy of the pre-migration file to `projects/backups/<id>.v<oldVersion>.<timestamp>.json` _before_ running any migration or re-saving the canonical file. A buggy migration can corrupt the canonical project file, but the original bytes are recoverable from the backup path.

**Still open:** there is no restore/rollback API. If a migration corrupts a project, recovering it today means manually reading the backup path and re-saving it as the canonical project — there's no `ProjectRepository.restoreBackup(id)` method yet. Deliberately not built now (per `CLAUDE.md`'s "no half-finished implementations" — a real rollback UX belongs with whatever surfaces migration failures to the user, likely the Editor Service in Phase 15, not this low-level repository).

## Open questions

- No corruption/checksum detection on read — a project file that's truncated or has invalid JSON currently throws from `JSON.parse` inside `load()`. Whether that should instead fall back to the most recent backup automatically is an open UX decision, not just a storage one.
- Backups accumulate forever (no retention policy). Fine for MVP; needs a cap (e.g. keep last N per project) before this ships broadly.
