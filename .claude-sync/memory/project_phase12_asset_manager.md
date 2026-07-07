---
name: project-phase12-asset-manager
description: "Phase 12 Asset Manager decisions — AssetId derived from content hash for exact dedup, AssetDependencyGraph reuses shared Hierarchy primitive, no worker/proxy/real-storage wiring yet"
metadata: 
  node_type: memory
  type: project
  originSessionId: c0cd8590-ce94-4839-8cc6-e4e407408e69
---

Phase 12 (`packages/assets`) implemented the Asset Manager, complete as of
2026-07-07 (branch `phase-12-asset-manager`, commit `f311430`).

- **`AssetId` is the content hash itself** (`createAssetId(contentHash)`),
  not a separately generated id. This makes PLAN.md's "dedup by content
  hash = one asset" exact at the catalog level: re-importing identical
  bytes resolves to the same `AssetId`, so `importAsset` short-circuits on
  `catalog.get(assetId)` before re-running metadata/thumbnail/waveform
  extraction. Storage's own `AssetBlobStore.put()` (Phase 3) already dedups
  the underlying bytes on disk — this phase's actual contribution is
  catalog-level dedup, which is the real product requirement.
- **`AssetDependencyGraph` reuses the shared `Hierarchy<TId>` primitive**
  (ADR-005 #2) instead of a bespoke graph — `Hierarchy`'s own doc comment,
  written back in Phase 4, already named this exact future consumer. An
  asset is a one-level parent, reference ids (opaque strings, e.g. a
  TrackItemId) are leaves. Safe-delete and "unused assets" are the same
  mechanism (`getReferences().length === 0`), not two, per ADR-002.
- **No engine-to-engine imports**: `AssetManager` never reaches into
  Layer/Timeline to discover references itself. Callers (today: tests;
  eventually command handlers) call `registerReference`/`unregisterReference`
  explicitly. `@motion-studio/assets`'s `package.json` depends only on
  `@motion-studio/shared`, matching every engine since Phase 7.
- **Every storage/decoder dependency is a DI interface**, not an import of
  `@motion-studio/storage`: `IAssetBlobStore`/`IAssetCatalogStore`/
  `IThumbnailStore`/`IWaveformStore` structurally match Storage's real
  `AssetBlobStore`/`IRepository<T>`/`ThumbnailCache`/`WaveformRepository`
  (all already implemented in Phase 3) with no dependency wired up yet —
  same "engine exists, integration is later" gap as Export's Mediabunny DI
  and Audio's `IAudioContext`. `IMetadataExtractor`/`IThumbnailGenerator`/
  `IWaveformGenerator` are separate pure-compute DI interfaces (no real
  decoder exists anywhere in the codebase).
- Type detection (`detectAssetType`) checks file extension **before** MIME
  type, not after — `.cube` LUTs and fonts routinely report an empty/generic
  `File.type` from real drag-and-drop, so MIME-first would misclassify or
  reject them.
- Added to `@motion-studio/shared`: `AssetType` enum (Video/Image/Audio/
  Font/LUT) in `enums.ts`, `AssetDeleted` event in `event.ts` (joining the
  already-speculative `AssetImported`/`AssetImportFailed`).

**Explicitly out of scope this phase** (not in PLAN.md's Phase 12
checklist, flagged in docs rather than built): proxy generation for large
video, thumbnail LOD-by-zoom-level, worker-based pipeline execution, tag
editing API (tags is a data field only), categories/favorites/collections
(ADR-002 makes these UI view-config, not engine state, if ever built).

See [[project_architecture_rules]], [[project_phase3_storage_engine]] (AssetBlobStore/ThumbnailCache/WaveformRepository this phase builds on), [[project_phase4_layer_engine]] (Hierarchy primitive origin), [[feedback_phase_branching]].
