# Thumbnail Cache

> Status: Implemented (Phase 3, 2026-07-06). See `packages/storage/src/thumbnail-cache.ts`.

Thumbnail images, shared by Timeline UI and Asset Browser, keyed by `assetId + timestamp` — where "timestamp" is the `Tick` within the asset the thumbnail was generated at (not a wall-clock time), per `CLAUDE.md`'s "internal time is always integer Ticks" rule.

## Shape

Stored under IndexedDB at `thumbnails/<assetId>/<tick>` as raw image bytes (`Uint8Array`) — not JSON, since thumbnail data is binary. This is why `ThumbnailCache` is its own small class rather than extending `JsonRepository<T>`: the same "one repository per data type" principle from `overview.md` applies, but the generic JSON repository shape doesn't fit binary blobs keyed by a compound id.

`listTicks(assetId)` and `deleteAllForAsset(assetId)` both work off the VFS `list()` prefix scan under `thumbnails/<assetId>/`, so thumbnails are naturally cleaned up per-asset without needing a separate index.

## Open questions

- No generation/eviction policy is implemented here — this module only stores and retrieves bytes handed to it. Deciding _which_ ticks get a thumbnail generated, at what resolution, and when stale ones get evicted is a Timeline UI / Asset Browser concern (Phase 15), not Storage's.
- No dedup: two different assets that happen to produce byte-identical thumbnail images are stored twice (unlike `AssetBlobStore`, which dedups by design). Not worth the complexity of a content-hash indirection for thumbnails specifically — revisit only if real storage pressure shows up.
