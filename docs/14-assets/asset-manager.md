# Asset Manager

> Status: Implemented (Phase 12, 2026-07-07). See `packages/assets/src/asset-manager.ts`, `asset-catalog.ts`.

Duplicate detection is the single hash-based mechanism described in
`importer.md` — there is no second, separate dedup path here, resolving
the original stub's "single hash-based implementation, not three" note.
Categories, favorites, and collections from the original stub are **not
implemented**: PLAN.md Phase 12's checklist doesn't include them, and per
ADR-002 they'd be UI-layer _view configuration_ over this catalog if/when
`../17-ui/asset-browser.md` needs them, not additional state here.

## `AssetCatalog` (`asset-catalog.ts`)

Thin query layer over `IAssetCatalogStore`, a DI interface matching
`@motion-studio/storage`'s `IRepository<T>` shape (`create/delete/get/list`)
— a real `JsonRepository<IAssetCatalogEntry>` would satisfy it without
this package depending on `@motion-studio/storage`. `IAssetCatalogEntry`:

```ts
{ id: AssetId; name: string; type: AssetType; mimeType: string;
  sizeBytes: number; durationTicks: Tick | undefined; contentHash: string;
  tags: readonly string[]; createdAt: number }
```

`id` is the content hash cast to `AssetId` — see `importer.md` for why
that's what makes dedup exact.

## `AssetManager` (`asset-manager.ts`)

`IEngine` facade ("single source of truth for all assets," PLAN.md)
tying together: `IAssetBlobStore`, `AssetCatalog`, `IMetadataExtractor`,
optional `IThumbnailGenerator`/`IThumbnailStore`,
optional `IWaveformGenerator`/`IWaveformStore`, an `AssetDependencyGraph`,
and an optional `IAssetEventSink`. Matches `ExportEngine`/`HistoryEngine`'s
split — the engine class is bookkeeping only, `import-pipeline.ts`'s
`importAsset()` does the actual work.

- `import(input)` → delegates to `importAsset`.
- `get(assetId)` / `list()` → delegate to `AssetCatalog`.
- `delete(assetId, { force? })` → safe-delete (see `metadata.md`); on
  success also deletes the blob, thumbnail(s), and waveform, then emits
  `AssetDeleted` (added to `@motion-studio/shared`'s event catalog this
  phase).
- `registerReference` / `unregisterReference` → forward to the
  `AssetDependencyGraph`.
- `listUnused()` → catalog entries with zero incoming references.

## Never does

Own a second registry of what assets exist (`AssetCatalog` is the only
one), reach into Layer/Timeline to discover references itself (see
`metadata.md`'s "never reaches into Layer/Timeline directly"), or touch
IndexedDB/OPFS — all storage is behind the DI interfaces in
`asset-storage.ts`.

## Open questions

- **Real storage wiring.** `IAssetBlobStore`/`IAssetCatalogStore`/
  `IThumbnailStore`/`IWaveformStore` have no concrete implementation
  provided from `@motion-studio/storage` yet — same "engine exists,
  integration is later" gap as every DI boundary since Rendering (Phase
  7). The real classes already exist in `packages/storage/src` (Phase 3)
  and are structurally compatible; wiring them up is glue code, not new
  design.
- **Tag editing API.** `tags` is a field on `IAssetCatalogEntry` but there
  is no `addTag`/`removeTag` method — not required by PLAN.md Phase 12,
  left for whichever phase actually builds tag editing UI.
