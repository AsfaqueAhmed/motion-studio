# Importer

> Status: Implemented (Phase 12, 2026-07-07). See `packages/assets/src/import-pipeline.ts`.

## Pipeline

```
validate (non-empty, supported type) → hash + store (IAssetBlobStore, dedup for free)
→ detect type (extension first, MIME fallback) → extract metadata
→ thumbnail (Image/Video) → waveform (Audio, or Video with an audio track)
→ register in catalog → AssetImported
```

`importAsset(input, deps)` is a standalone function, not a class — same
split as `runExportJob` (Phase 10) and `HistoryEngine`: an `IEngine`
facade (`AssetManager`) owns lifecycle, the pipeline function owns the
actual logic.

**Runs on the caller's thread**, not in a worker. "Everything after
validation runs in workers" was the original stub's claim; no worker
infrastructure exists anywhere in this codebase yet (checked: `Core`'s
`WorkerManager` from Phase 2 has no caller in Export or Assets), so this
is deferred, matching Export's job runner.

## Type detection (`supported-types.ts`)

Extension is checked before MIME type, not after. Real drag-and-drop and
OPFS file handles frequently report an empty or generic `File.type` for
fonts and `.cube` LUTs specifically, so a MIME-first check would
misclassify or reject them. `detectAssetType(fileName, mimeType)` returns
`undefined` for anything outside PLAN.md Phase 12's supported-type list,
and `importAsset` rejects before hashing when that happens — no wasted
hash/store work on an unsupported file.

## Dedup (PLAN.md "same file imported twice = one asset")

The asset id **is** the content hash (`createAssetId(contentHash)`), not
a separately generated id looked up by hash. This means:

- Re-importing identical bytes always resolves to the same `AssetId`,
  with no separate "find by hash" catalog query needed.
- `importAsset` checks `catalog.get(assetId)` before running metadata
  extraction, thumbnail generation, or waveform generation — a duplicate
  import costs one hash + one catalog read, not the full pipeline.
- `IAssetBlobStore.put()` (mirroring the real `AssetBlobStore`, Phase 3)
  independently dedups the underlying bytes on disk; this phase's
  contribution is dedup at the _catalog_ level, which is the actual
  product requirement ("one asset," not "one file on disk").

## Proxy generation — not implemented

The original stub included "Proxy" as a pipeline stage. Not in PLAN.md
Phase 12's checklist; skipped entirely, including from the diagram above.
See `overview.md`'s "Proxy system" section for the open technical risk
this leaves unresolved.

## Open questions

- **Worker wiring.** No pipeline step actually runs off the main thread
  yet. Blocking the UI thread on `crypto.subtle.digest` for a multi-GB
  video file has never been measured (same unmeasured risk noted in
  Storage Engine and Export Engine docs).
- **Batch import.** `importAsset` takes one file at a time; a multi-file
  drop needs a caller-side loop (or a future `importMany`) — not designed
  here.
