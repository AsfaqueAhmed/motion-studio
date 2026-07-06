# IndexedDB

> Status: Implemented (Phase 3, 2026-07-06). See `packages/storage/src/indexeddb-adapter.ts`.

Stores small/structured data: project JSON, settings, thumbnails, waveforms — everything under the `projects/`, `settings/`, `thumbnails/`, `waveforms/` top-level VFS directories (see `overview.md`).

## Shape

One database (`motion-studio`), one object store (`vfs`), keyed by the full VFS path (`keyPath: "path"`). Every record is `{ path, data: Uint8Array }` — IndexedDB structured-clones typed arrays natively, so no manual (de)serialization is needed at this layer (`JsonRepository`/`ProjectRepository` handle JSON encoding above it).

## `list(prefix)` — no native prefix query

IndexedDB has no prefix index. `list()` does a lexicographic range scan instead:

```ts
IDBKeyRange.bound(prefix, prefix + "￿");
```

`￿` is the highest BMP code point, so the range covers every key that starts with `prefix` without also matching keys that merely sort after it. This works because VFS paths are plain strings and IndexedDB key ranges compare lexicographically.

## Testing

Real `indexedDB`/`IDBKeyRange` aren't available in a Node/Vitest environment. `IndexedDBAdapter` takes both as constructor-injected dependencies (defaulting to `globalThis.indexedDB` / `globalThis.IDBKeyRange`), mirroring the `WorkerFactory` injection pattern already used in `packages/core`. Tests inject the real `fake-indexeddb` package (`IDBFactory` export) — a maintained polyfill — rather than a hand-rolled fake, since IndexedDB's async/event-based API is too large to meaningfully shrink into a bespoke structural interface (unlike the small `Worker` surface `IWorkerLike` covers). Each test constructs a fresh `IDBFactory` instance to avoid cross-test database state.

## Open questions

- Real-browser behavior of the `￿` range trick against Safari's IndexedDB implementation hasn't been checked — `fake-indexeddb` should be spec-accurate, but this is worth a spot-check once Playwright e2e tests exist (Phase 16).
- No storage-quota handling yet: a `QuotaExceededError` from a write propagates as a raw exception with no retry/eviction policy. Not needed until the asset/thumbnail caches (3.3) grow large enough in practice to matter.
