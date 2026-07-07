# Assets Engine — Overview

> Status: Implemented (Phase 12, 2026-07-07). See `packages/assets/src`.

**The single canonical asset management engine.** Earlier design drafts
independently specified this twice — once as a "Media Engine," once
again as an "Assets Panel" with a near-identical registry, database,
categories, and public API. This folder is the merged, single source of
truth; the UI-facing browser is a thin view over it. See
`../DECISIONS.md` ADR-002.

## Owns

Import, validation, hashing/dedup (delegated to `IAssetBlobStore`, see
below), metadata extraction, thumbnail/waveform generation, and the Asset
Dependency Graph (which references — today: TrackItem ids, passed in as
opaque strings — point at a given asset; enables safe-delete and "unused
assets"). Tagging is a data field on the catalog entry only — no
dedicated tag-editing API this phase, since PLAN.md Phase 12 doesn't
require one; favorites/collections/search were never in the Phase 12
checklist either and are not implemented.

## Never does

Decode media itself (delegates to `IMetadataExtractor` /
`IThumbnailGenerator` / `IWaveformGenerator` — all DI interfaces, no real
decoder wired up yet), render, play audio, or touch IndexedDB/OPFS
directly. `IAssetBlobStore` / `IAssetCatalogStore` / `IThumbnailStore` /
`IWaveformStore` are DI interfaces structurally matching
`@motion-studio/storage`'s real `AssetBlobStore` / a `JsonRepository` /
`ThumbnailCache` / `WaveformRepository` — same convention as every phase
since Rendering (Export's `IMuxerFactory`, Audio's `IAudioContext`):
`@motion-studio/assets`'s `package.json` depends only on
`@motion-studio/shared`, no cross-engine import.

## Import pipeline (`import-pipeline.ts`)

```
validate (non-empty, supported type) → hash + store (IAssetBlobStore, dedup for free)
→ detect type (extension first, MIME fallback — supported-types.ts)
→ extract metadata → thumbnail (Image/Video) → waveform (Audio, or Video with an audio track)
→ register in catalog → AssetImported
```

Runs on the caller's thread today — no worker wired up yet, the same gap
as Export's job runner (Phase 10). Failure at any step emits
`AssetImportFailed` with a reason and rethrows, matching
`runExportJob`'s catch/emit/rethrow shape.

**The asset's id is derived from its content hash.** This makes "dedup by
content hash" (PLAN.md) exact, not approximate: re-importing identical
bytes resolves to the same `AssetId`, so `importAsset` short-circuits on
an existing catalog entry before re-running metadata/thumbnail/waveform
extraction — "same file imported twice = one asset" at the catalog level,
not just "one blob on disk."

## Proxy system — not built this phase

The original spec calls this "the single most important thing for making
the editor usable on real hardware with 4K+ footage," but it is not in
PLAN.md Phase 12's checklist and was not implemented. Needs
`VideoEncoder` (not just decode) for the downscale re-encode — see the
open risk below, unconfirmed either way.

## Confirmed technical gaps to verify during implementation

- **Container demuxing** (MP4/MOV/WEBM/AVI/MKV) isn't just "WebCodecs
  decode" — needs format-specific demuxer libraries. `IMetadataExtractor`
  is a DI interface for exactly this reason; no real demuxer is wired in
  yet.
- **Proxy generation needs `VideoEncoder`** — still unconfirmed, and now
  additionally out of this phase's scope entirely (see above).
- **Hashing cost for large files** is asserted to run in a worker but
  never actually measured — carried over unresolved from Storage (Phase 3) and Export (Phase 10)'s equivalent notes. `IAssetBlobStore.put()`
  runs on the caller's thread at every current call site (tests only).

## UI layer

`../17-ui/asset-browser.md` renders this engine's data — it does not
maintain its own registry, database, or dedup logic.
