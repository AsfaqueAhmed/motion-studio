---
name: project-phase3-storage-engine
description: "Phase 3 Storage Engine implementation decisions and API shapes (VFS, IndexedDB/OPFS adapters, project persistence, asset/thumbnail/waveform caches)"
metadata: 
  node_type: memory
  type: project
  originSessionId: c3d3a776-f9dc-4fdf-98ab-1e17e0422a05
---

Phase 3 (Storage Engine, `packages/storage`) is complete as of 2026-07-06, on branch `phase-3-storage-engine` (not yet merged to main), following [[feedback_phase_branching]].

**Why this shape:** `packages/storage` is the only package allowed to touch IndexedDB/OPFS (CLAUDE.md rule); everything else depends on `IVFS`. Followed the same DI/structural-interface conventions as [[project_phase2_core_engine]] (`WorkerFactory`/`IWorkerLike` pattern) rather than inventing new ones.

**How to apply:** When Phase 4/5 (Layer/Timeline engines) or Phase 12 (Asset Manager) need persistence, they should depend on `IVFS`/`ProjectRepository`/`AssetBlobStore`/etc. from `@motion-studio/storage`, never import `IndexedDBAdapter`/`OpfsAdapter` directly, and never construct a new top-level VFS directory without adding it to `storage-engine.ts`'s routing `Set`s.

Key shapes:
- `IStorageAdapter` (= `IVFS`): `read/write/delete/exists/list`, implemented by `IndexedDBAdapter` and `OpfsAdapter`.
- `StorageEngine` implements `IEngine` + `IVFS`, routes by top-level path directory (`projects/settings/thumbnails/waveforms` → IndexedDB; `assets/models/voice-cache/exports` → OPFS), throws on an unregistered directory (WorkerManager-style fail-fast).
- `IndexedDBAdapter`: one DB (`motion-studio`), one object store (`vfs`) keyed by path; `list(prefix)` uses `IDBKeyRange.bound(prefix, prefix + "￿")` (no native prefix query). Tests use the real `fake-indexeddb` package (not a hand-rolled fake) since IndexedDB's API is too large to usefully shrink.
- `OpfsAdapter`: path segments map to nested OPFS directories, final segment = file name. Structural `IOpfsDirectoryHandle`/`IOpfsFileHandle` interfaces (mirrors `IWorkerLike`) let tests inject an in-memory fake (`test-support/fake-opfs.ts`). `list()` descends directly into the prefix directory when the prefix ends in `/` (all real callers do this) instead of walking the whole tree.
- `IRepository<T>` generic (`create/update/delete/get/list`) + `JsonRepository<T>` base (one JSON blob per id) — only `WaveformRepository` uses it directly. `ProjectRepository` (save/load/list/delete + migration) and `ThumbnailCache`/`AssetBlobStore` (binary, compound/content-hash keys) intentionally stand alone instead of forcing into the generic shape.
- Project schema v1 (`IProjectFileV1`) is Storage's *persisted* DTO shape (Composition/Track/TrackItem/Layer refs), explicitly documented as not the same as Timeline's future runtime model (Phase 5 doesn't exist yet) — Timeline will map to/from it later.
- `MigrationRunner` guards two failure modes not in the original PLAN.md checklist: stored schema version newer than the app supports (throws), and a migration that doesn't advance `schemaVersion` (throws instead of infinite-looping).
- Backup-before-migrate is implemented (`ProjectRepository` writes `projects/backups/<id>.v<oldVersion>.<timestamp>.json` before migrating) but there is **no restore/rollback API yet** — deliberately left as an open item (CLAUDE.md's open ADR on migration rollback is only half-resolved), since building it now would be a half-finished implementation ahead of whatever surfaces migration failures to the user (likely Phase 15 Editor Service).
- `AssetBlobStore.hashContent()` uses `crypto.subtle.digest` synchronously on the caller's thread — the "hashing cost for large files" open risk from `docs/12-storage/overview.md` is still unmeasured/unresolved, not solved by this phase.
- Autosave (dirty-flag + debounce) was explicitly *not* built in Phase 3 — it's an Editor Service concern (Phase 15) that will call `ProjectRepository.save()`, not a Storage package responsibility.
- Updated `docs/12-storage/*.md` stubs (overview, indexeddb, opfs, project-schema, asset-cache, thumbnail-cache) with real findings, per [[feedback_docs_workflow]].
- 45 Vitest unit tests, all passing; full workspace `pnpm build`/`lint`/`test` clean. `pnpm typecheck` still fails workspace-wide on a pre-existing `tsc -b --noEmit` + composite-references issue unrelated to this phase (also reproduces on `packages/core`) — not introduced by Phase 3, not fixed either.

Phase 4 (Layer Engine, `packages/layer`) is next per PLAN.md.
