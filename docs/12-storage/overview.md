# Storage Engine — Overview

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

## Repositories

One repository per data type (ProjectRepository, AssetRepository,
ThumbnailRepository, ModelRepository, etc.) — never one giant
repository. Each implements a generic `IRepository<T>` interface
(`create`, `update`, `delete`, `get`, `list`).

## Autosave

Dirty-flag + debounce, not save-on-every-action: `move layer → mark
dirty → wait ~1000ms of inactivity → save`.

## Open risks (unresolved, real)

- **Migration failure/rollback is unspecified.** Given this app is
  local-only with no cloud backup by default, a failed schema migration
  risks genuine, unrecoverable project loss. At minimum, back up before
  migrating. This needs to be resolved before `project-schema.md` is
  implemented — see `../DECISIONS.md`.
- **Asset hashing cost for large files** (multi-GB video, for dedup) is
  asserted to run "in a worker" but never actually measured — worth a
  quick check during implementation, not assumed free.
- **Performance goals need reconciling with stress tests**: `<500ms`
  project open and `<50ms` metadata lookup are stated as goals
  alongside "import 10GB project" and "open 5000 assets" as stress
  tests — clarify whether the goal number is meant to hold even at that
  scale, or only for a "normal" project.
