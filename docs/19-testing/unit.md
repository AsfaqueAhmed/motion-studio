# Unit

> Status: Phase 16 complete (2026-07-07). Real findings below replace the stub.

Unit testing strategy per engine (interpolation, commands, repositories, etc.).

## Scope

Every engine already grew unit tests co-located with its source (`*.test.ts`
next to the file it tests) as each phase was built — Phase 16 audited that
existing coverage against PLAN.md 16.1's checklist rather than starting from
zero, then filled the real gaps found:

- **All Commands (execute/undo/redo round-trip)** — every `ICommand` in
  `packages/timeline`/`packages/animation`/`packages/history` already had
  full round-trip tests. The gap was `apps/studio/src/editor-kernel/commands/*.ts`
  (`AddLayerCommand`, `AddTrackItemCommand`, `AddAnimationClipCommand`,
  `AddPropertyTrackCommand`, `UpdateLayerCommand`, `RegisterAssetReferenceCommand`)
  — six Commands added during Phase 15 with zero tests. All six now have
  execute → undo → redo tests. Also added the missing `redo()` assertion to
  `SplitTrackItemCommand`/`RippleDeleteCommand`'s existing tests (they only
  covered execute/undo).
- **Tick arithmetic utilities** — `packages/shared/src/tick.ts` had no test
  file at all before Phase 16; `tick.test.ts` now covers rounding, the
  `1s @ 30fps = 900 ticks` GLOSSARY.md example, and round-trips across a
  matrix of fps/tickResolution/seconds.
- **Frame State evaluation** — already covered by
  `apps/studio/src/editor-kernel/frame-state-builder.test.ts` (Phase 15).
- **Keyframe interpolation** — `easing.test.ts`/`interpolators.test.ts` were
  solid, but `evaluator.test.ts`'s `evaluateSegment` tests only ever used a
  Number property definition — Color/Vector2 interpolation was unit-tested
  in isolation (`interpolators.test.ts`) but never exercised through
  `evaluateSegment` itself with Bezier/Step interpolation. Added tests for
  both.
- **VFS adapter (mock IndexedDB/OPFS)** — already covered
  (`fake-indexeddb` + a hand-rolled fake OPFS root in
  `packages/storage/src/test-support/`). Confirmed sufficient for the unit
  tier; the real-browser gap this implied is what `integration.md` covers.
- **Asset dedup by content hash** — already covered by
  `packages/assets/src/import-pipeline.test.ts`.

## Open questions

None outstanding for this tier — see `integration.md` and `e2e.md` for what
still needs real-browser coverage.
