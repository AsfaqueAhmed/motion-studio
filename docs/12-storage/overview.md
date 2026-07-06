# Storage Engine — Overview

> Status: Implemented (Phase 3, 2026-07-06). See `packages/storage/src/`.

The only module that talks to actual browser storage. Every other engine
goes through the VFS (Virtual File System) abstraction — never directly
to IndexedDB or OPFS.

## Storage split

| Data                                                     | Location  | Why                                                                    |
| -------------------------------------------------------- | --------- | ---------------------------------------------------------------------- |
| Project JSON, timeline, settings, thumbnails, waveforms  | IndexedDB | Small, structured data                                                 |
| Video/audio/image files, AI models, voice cache, exports | OPFS      | Large binaries — 2-4x faster than IndexedDB for this, native streaming |

Both are confirmed to have solid, consistent browser support as of 2026
(see `../TECH_STACK.md`) — OPFS in particular is the most reliable API
in the entire stack.

## The VFS abstraction

```
Engine → VFS → (decides where data actually lives) → IndexedDB / OPFS
```

This is what lets a future storage backend (cloud sync, alternate
providers) be added without touching any engine's code, and makes
storage trivially mockable in tests.

`StorageEngine` (`packages/storage/src/storage-engine.ts`) is the concrete
`IVFS` implementation: it routes a path to `IndexedDBAdapter` or
`OpfsAdapter` by top-level directory, using exactly the split in the table
above (`projects/`, `settings/`, `thumbnails/`, `waveforms/` → IndexedDB;
`assets/`, `models/`, `voice-cache/`, `exports/` → OPFS). A path whose
top-level directory isn't in either list throws immediately, the same
"throw on unregistered" pattern `WorkerManager` uses for unregistered
worker slots — there's no silent fallback. If a future phase needs a new
top-level directory, add it to one of the two `Set`s in
`storage-engine.ts`.

## Repositories

One repository per data type (`ProjectRepository`, `WaveformRepository`,
`ThumbnailCache`, `AssetBlobStore`) — never one giant repository.
`WaveformRepository` extends the generic `JsonRepository<T>` base
(`create`/`update`/`delete`/`get`/`list`, one JSON blob per id). Three
repositories deliberately don't: `ProjectRepository`'s `save`/`load` API
carries migration/backup behavior specific enough to stand alone;
`ThumbnailCache` and `AssetBlobStore` store raw binary data keyed
compound-ly (`assetId + tick`) or by content hash rather than a plain id,
which doesn't fit the generic JSON shape.

## Autosave

Not yet implemented. Dirty-flag + debounce (`move layer → mark dirty →
wait ~1000ms of inactivity → save`) is an Editor Service concern that
reacts to Commands (Phase 15) — it calls `ProjectRepository.save()`, it
doesn't live in `packages/storage` itself.

## Open risks

- **Migration failure/rollback — partially resolved.** `ProjectRepository`
  now backs up a project's pre-migration bytes before running any
  migration (see `project-schema.md`), so a bad migration can't destroy
  the only copy. There is still no restore/rollback _API_ — recovering a
  corrupted project today means manually reading the backup path. See
  `project-schema.md` "Migration failure/rollback — resolved (partially)".
- **Asset hashing cost for large files** (multi-GB video, for dedup) is
  still unmeasured — `AssetBlobStore.put()`/`hashContent()` run
  synchronously on the caller's thread, not in a worker. See
  `asset-cache.md`.
- **Performance goals need reconciling with stress tests**: `<500ms`
  project open and `<50ms` metadata lookup are stated as goals
  alongside "import 10GB project" and "open 5000 assets" as stress
  tests — clarify whether the goal number is meant to hold even at that
  scale, or only for a "normal" project. Not measured yet; no
  integration/perf test exists against real IndexedDB/OPFS (Phase 16.2
  territory, not Phase 3's unit tests).
