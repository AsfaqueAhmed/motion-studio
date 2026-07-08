# Integration

> Status: Phase 16 complete (2026-07-07). Real findings below replace the stub.

Integration testing across engine boundaries (playback, undo/redo, drag-drop).

## Scope

PLAN.md 16.2 asked for "Vitest + real OPFS in worker." Two revisions from
the original plan, both confirmed by what actually got built rather than
assumed upfront:

- **No worker needed.** `OpfsAdapter` (`packages/storage/src/opfs-adapter.ts`)
  only ever calls the async, main-thread-compatible OPFS API
  (`getDirectory`/`getFileHandle`/`createWritable`) — never
  `createSyncAccessHandle`, which is the one OPFS API that's worker-only.
  So these tests run on the main thread of a real browser, no Worker
  plumbing required.
- **Real browser via Vitest browser mode**, not a hand-rolled harness:
  `@vitest/browser` + the `playwright` provider (Chromium, headless), one
  `vitest.integration.config.ts` per package (`storage`, `assets`'s real
  wiring lives in `apps/studio`, `export`), restricted to
  `**/*.integration.test.ts` via `include`, with the unit-tier
  `vitest.config.ts` excluding that same pattern so the two tiers never run
  each other's files. `pnpm test:integration` (root) runs all three via
  Turborepo; `cache: false` in `turbo.json` since these touch real browser
  storage state each run.

Three suites, matching PLAN.md's checklist exactly:

1. **Project save → load → verify round-trip**
   (`packages/storage/src/project-repository.integration.test.ts`) — the
   same `ProjectRepository` the unit test exercises against an in-memory
   VFS, here run against a real `StorageEngine` (real `indexedDB`, not
   `fake-indexeddb`). `"projects/"` routes to IndexedDB, not OPFS, per
   `storage-engine.ts`'s directory table — this suite doesn't touch OPFS at
   all, which is why the asset suite below exists separately.
2. **Asset import → catalog → dedup**
   (`apps/studio/src/editor-kernel/asset-manager.integration.test.ts`) —
   `AssetCatalogRepository` (the real `JsonRepository`-backed catalog store)
   only exists in `apps/studio`, not `@motion-studio/assets` itself (see
   its own doc comment), so this is where the _real_ OPFS-backed
   `AssetBlobStore` + real `browserMetadataExtractor` (genuine
   `createImageBitmap`, not a fake) get exercised end-to-end. Uses a real,
   Pillow-generated 2×2 PNG fixture — an earlier hand-rolled "minimal" PNG
   byte sequence didn't actually decode in Chromium (`InvalidStateError:
The source image could not be decoded`), so don't hand-roll image
   fixtures; generate them with a real encoder.
3. **Export pipeline (Spike A validated path only)**
   (`packages/export/src/webcodecs-pipeline.integration.test.ts`) —
   `ExportEngine` itself still has no real Mediabunny backend wired (see
   `container.ts`'s doc comment — that's real feature work, out of scope
   for a testing phase). This test instead makes the throwaway
   `spikes/spike-a-export/` pipeline permanent: real `mediabunny` (added as
   a devDependency, pinned to the version the spike validated, 1.50.6),
   the same `public/sample.mp4` fixture the spike used (now checked in at
   `packages/export/src/test-support/fixtures/sample.mp4`), decode → render
   → re-encode → mux → and — going one step further than the spike's
   "played in a `<video>` tag" check — parse the muxed output back through
   Mediabunny itself (`Input`/`VideoSampleSink`) and assert frame count and
   dimensions match. Opus only; AAC is untested here since this suite
   doesn't vary by browser engine in CI (see `webcodecs.md` for the
   Firefox AAC gap that made Opus the default in the first place).

## Open questions

None outstanding — all three checklist items are covered.
