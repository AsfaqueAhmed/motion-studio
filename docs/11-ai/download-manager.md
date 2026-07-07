# Download Manager

> Status: Implemented (Phase 13, 2026-07-07). See `packages/ai/src/model-downloader.ts`.

Model download with checksum verification. Resumability is **not
implemented** — a failed or interrupted download must be retried from
scratch by the caller; no partial-download/range-request support exists.

## `IModelDownloader` (`model-downloader.ts`)

```ts
interface IModelDownloader {
  download(url: string): Promise<Uint8Array>;
}
```

Hand-rolled DI interface rather than calling `fetch` directly, so tests
can inject deterministic bytes without a real network — same pattern as
every other network/storage boundary in this codebase. No real
`fetch`-backed implementation ships in this package.

## Checksum verification

`sha256Hex(data)` — SHA-256 via Web Crypto (`crypto.subtle`), available in
both browsers and Node 20+. Deliberately reimplements
`packages/storage/src/asset-blob-store.ts`'s `hashContent` locally rather
than importing `@motion-studio/storage`, since AI has no dependency on
that package (engines never import each other's concrete packages, only
`@motion-studio/shared`).

`downloadAndVerify(downloader, modelId, url, expectedSha256)` downloads
then verifies in one call, throwing `ModelChecksumMismatchError` — the
caller is never handed unverified bytes. `ModelManager.ensureLoaded()` is
the only caller today.

## Progress reporting

Not real byte-level progress: `ModelManager` emits `ModelDownloadProgressed`
at `0` before the download starts and `1` after it (and checksum
verification) completes. A real implementation could report incremental
progress via `fetch`'s `ReadableStream` body, but that streaming plumbing
is not wired up this phase — same "not yet a Worker" gap as Export's job
runner and Assets' import pipeline.

## Open questions

- **Resumable/partial downloads** for large models (Kokoro-82M `fp32` is
  ~326 MB, per `kokoro.md`) — not attempted.
- **Real progress percentages** — needs a streaming `IModelDownloader`
  implementation with a progress callback, not designed here.
