# Model Manager

> Status: Implemented (Phase 13, 2026-07-07). See `packages/ai/src/model-manager.ts`.

Download/verify/store/load/unload lifecycle for models, stored in OPFS
(via a DI interface — `ModelManager` itself never touches IndexedDB/OPFS).

## `ModelManager` (`model-manager.ts`)

Depends on `IModelBlobStore` (`model-store.ts`), `IModelDownloader`
(`model-downloader.ts`), `IOnnxRuntime` (`inference-backend.ts`), and
`IInferenceCapabilityProbe` (`inference-backend.ts`) — all DI interfaces,
no concrete `@motion-studio/storage`/`onnxruntime-web` dependency wired up
yet, same "engine exists, integration is later" gap as every DI boundary
since Rendering (Phase 7).

`registerModel(descriptor: IModelDescriptor)` — `{ id, url, sha256,
sizeBytes }`, keyed by `id`.

`ensureLoaded(modelId, preferredBackend?)`:

1. Return the cached `IInferenceSession` if already loaded — no
   re-download, no new session.
2. Otherwise: check `IModelBlobStore` (warm path) — if present, skip the
   network entirely (`docs/11-ai/kokoro.md`'s measured 84s cold vs. 0.5s
   warm load gap is exactly this branch).
3. Cold path: `downloadAndVerify()` (download-manager.md) → write to
   `IModelBlobStore`.
4. `resolveInferenceBackend()` (WebGPU → WASM) → `IOnnxRuntime.createSession()`.
5. Cache the session, emit `ModelLoaded`.

Emits `ModelDownloadProgressed` (0 then 1 — not real byte-level progress,
see download-manager.md), `ModelLoaded`, and `ModelLoadFailed` (checksum
mismatch, missing registration, or a runtime error) through an injected
`IAIEventSink` — same generic-emit-shape pattern as Export's
`IExportEventSink`/Assets' `IAssetEventSink`.

`unload(modelId)` releases one session; `unloadAll()` releases every
loaded session (called from `AIManager.dispose()`).

## Never does

Evict models by LRU/memory pressure (no policy exists — same open gap as
GPU texture cache eviction, CLAUDE.md "Known hard risks" #6), retry failed
downloads, or report real download progress percentages.

## Open questions

- **Real storage/runtime wiring.** `IModelBlobStore`/`IOnnxRuntime` have no
  concrete implementation from `@motion-studio/storage`/`onnxruntime-web`
  yet.
- **LRU eviction.** Same "no memory budget number yet" blocker as
  Rendering's texture cache — not attempted here either.
- **Voice files** (Kokoro's per-voice `.bin` style tables) are **not**
  routed through `ModelManager` — `KokoroProvider` takes a separate
  `IVoiceBank` DI interface instead, since they're small per-voice data
  files rather than ONNX model weights. See `kokoro.md`.
