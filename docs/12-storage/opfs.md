# OPFS

> Status: Implemented (Phase 3, 2026-07-06). See `packages/storage/src/opfs-adapter.ts` and `opfs-handle.ts`.

Stores large binaries: video/audio/image files, AI models, voice cache, exports — everything under the `assets/`, `models/`, `voice-cache/`, `exports/` top-level VFS directories (see `overview.md`). Confirmed solid browser support (Chrome 86+, Firefox 111+, Safari 15.2+).

## Path convention

A VFS path maps directly to nested OPFS directories, with the final segment as the file name — e.g. `assets/ab/cdef1234` becomes directory `assets/ab/` containing a file `cdef1234`. Directories are created on demand (`{ create: true }`) during `write()`; `read()`/`exists()`/`delete()` never create missing directories.

## Structural typing instead of a fake

`opfs-handle.ts` defines `IOpfsDirectoryHandle`/`IOpfsFileHandle` — a minimal structural subset of the real `FileSystemDirectoryHandle`/`FileSystemFileHandle` APIs (`getDirectoryHandle`, `getFileHandle`, `removeEntry`, `entries`, `getFile`, `createWritable`). This mirrors how `packages/core`'s `WorkerManager` depends on `IWorkerLike` instead of the full `Worker` type: real browser handles satisfy the interface structurally, and tests can inject an in-memory fake (`test-support/fake-opfs.ts`) instead of needing a real OPFS-capable environment, which Node/Vitest is not.

The root is injected via an `OpfsRootFactory` (`() => Promise<IOpfsDirectoryHandle>`), defaulting to `navigator.storage.getDirectory()`, and resolved lazily once per adapter instance.

## `list(prefix)`

For the common case — every real caller passes a directory prefix ending in `/` — `list()` descends directly to the matching directory and walks only its subtree, rather than walking the entire OPFS root and filtering afterward. A prefix without a trailing slash (rarer, e.g. matching by partial file name) falls back to a full tree walk plus `startsWith` filtering, since there's no directory to descend into.

## Open questions

- `list()`'s full-tree-walk fallback path is `O(total files in OPFS)` — untested against a large asset library. Not expected to matter for MVP project sizes, but worth measuring once Phase 12's Asset Manager is in place and real libraries can be imported.
- No retry/backoff around transient OPFS lock contention (e.g. concurrent writes from multiple tabs) — out of scope until Phase 17 (PWA/multi-tab) is designed.
