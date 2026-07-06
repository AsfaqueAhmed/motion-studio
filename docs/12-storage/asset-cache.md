# Asset Cache

> Status: Content-hash blob store implemented (Phase 3, 2026-07-06). See `packages/storage/src/asset-blob-store.ts`.

## What's implemented now: content-addressed OPFS storage

`AssetBlobStore` stores binary asset data in OPFS keyed by the SHA-256 hash of its content (`assets/<hash>`, via Web Crypto's `crypto.subtle.digest`). `put(data)` hashes first, then only writes if a blob under that hash doesn't already exist — importing the same file twice is a no-op write the second time, which is what gives content-based dedup for free, without a separate dedup index.

This intentionally does **not** implement `IRepository<T>` like the other repositories in this package — there's no per-item id besides the hash of the content itself, and the store's only real operations are `put`/`get`/`has`/`delete` keyed by hash.

## What's not implemented yet: the Memory → IndexedDB → OPFS hierarchy

The original design note ("Memory -> IndexedDB -> OPFS cache hierarchy, LRU eviction") describes a multi-tier cache in front of OPFS — an in-memory hot cache and/or an IndexedDB tier, with LRU eviction once total size crosses some budget. **None of that exists yet.** Every `get()` call reads straight from OPFS. This is deliberate: LRU eviction needs a real memory/storage budget number, which doesn't exist yet (see the open GPU-memory-budget-shaped risk in `CLAUDE.md` — the same "don't design the eviction policy until you have a real number" logic applies here). Revisit once Phase 12 (Asset Manager) is importing real asset libraries and an actual budget can be measured.

## Open questions

- **Hashing cost for large files was asserted to be cheap but never measured.** `hashContent()` runs `crypto.subtle.digest` synchronously on the caller's thread (no worker offload) — for a multi-GB video import this could be a real, felt delay. Offloading to a worker, if needed, is the Asset Manager import pipeline's job (Phase 12) — `WorkerSlot` in `packages/core` already reserves no dedicated hashing slot, so that'll need a decision when Phase 12 lands.
- Partial/interrupted writes: if the app crashes mid-`put()`, OPFS may hold a partially-written file at the hash's path with no way to distinguish it from a complete one (there's no separate "commit" step or temp-file-then-rename). Worth a checksum-on-read step if this turns out to matter in practice.
