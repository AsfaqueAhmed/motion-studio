---
name: project-phase16-testing
description: "Phase 16 Testing decisions — unit gap audit, real-browser integration tier (Vitest browser mode), E2E scope cut down to what the UI actually supports, playwright.config.ts baseURL bug found"
metadata: 
  node_type: memory
  type: project
  originSessionId: 94132031-1fd9-4693-94d0-4b0411eb60ad
---

Phase 16 (Testing) is complete on branch `phase-16-testing` off
`phase-15-editor-ui`, with 16.3 (E2E) only partially complete by necessity
(see below). Unlike prior phases, this one didn't add new engine code —
every earlier phase already grew unit tests co-located with its source, so
this phase's job was auditing that existing coverage against PLAN.md's
16.1/16.2/16.3 checklists and filling real gaps, not writing tests from a
blank slate.

**16.1 unit gaps found and fixed** (audited via a dedicated Explore
subagent to avoid burning context reading every test file): `packages/shared/src/tick.ts`
had zero tests; all 6 `apps/studio/src/editor-kernel/commands/*.ts`
Commands (added in Phase 15) had zero tests despite every other package's
Commands having full round-trip coverage; `SplitTrackItemCommand`/
`RippleDeleteCommand` tests covered execute/undo but not redo;
`evaluator.test.ts`'s `evaluateSegment` only ever used a Number property,
never Color/Vector2 through Bezier/Step. Asset dedup and VFS-adapter-mock
coverage were already solid — no gap.

**16.2 integration tier is new infrastructure**: added `@vitest/browser` +
the `playwright` provider (Chromium, headless) as a *second* Vitest config
per package (`vitest.integration.config.ts`, `include: ["**/*.integration.test.ts"]`,
unit config excludes the same pattern), wired as `pnpm test:integration`
(`turbo.json` task, `cache: false`). Confirmed `OpfsAdapter` never uses the
worker-only `createSyncAccessHandle` API — only async main-thread OPFS
calls — so no actual Worker plumbing was needed despite PLAN.md saying
"real OPFS in worker." Three suites: project save/load (real IndexedDB,
`packages/storage`), asset import/dedup (real OPFS + real IndexedDB, lives
in `apps/studio` because `AssetCatalogRepository` only exists there, not in
`@motion-studio/assets`), and export pipeline (real `mediabunny`@1.50.6 +
real WebCodecs, making `spikes/spike-a-export/`'s throwaway pipeline
permanent — copied its `sample.mp4` fixture into
`packages/export/src/test-support/fixtures/`). A hand-rolled "minimal" PNG
byte sequence didn't decode in real Chromium (`createImageBitmap` threw
`InvalidStateError`) — always generate image fixtures with a real encoder
(Pillow), never hand-roll the bytes.

**16.3 E2E — real, load-bearing scope cut, confirmed via
AskUserQuestion before proceeding:** loading the actual running app
(Playwright) showed Trim has no UI anywhere, Export has no UI anywhere
(Phase 15 deliberately deferred it), and there is no way to create a
synthetic Text layer at all (every Layer is asset-driven, Font assets are
rejected from the Timeline). So "Text layer add → edit → style → export"
and "TTS generate → place on timeline → export with audio" are **fully
blocked**, not just missing their export step — untested until a Text
tool/synthetic-layer UI, an Export panel, and an AI/TTS panel exist. Only
"Import → move → undo → redo" (trim/export dropped) is covered, by
`apps/studio/e2e/editing-flow.spec.ts`.

**Two real bugs found, not hypothetical:**
1. `playwright.config.ts` had no `use.baseURL` — every spec's
   `page.goto("/")`, including the pre-existing Phase 15 `smoke.spec.ts`,
   has always failed with "Cannot navigate to invalid URL." The Phase 15
   "verified in headless Chromium" claim was from ad hoc manual driving,
   never from actually running the checked-in spec via `pnpm test:e2e`.
   Fixed by adding `use.baseURL: "http://localhost:3000"`.
2. dnd-kit swallows the click immediately following any drag's drop —
   globally, not just on the dragged element (browsers fire a synthetic
   click after drag-end; dnd-kit suppresses one to stop it misfiring the
   dragged element's own handler, but it also eats the *next real click
   anywhere*). Confirmed by clicking Toolbar Undo right after a clip-move
   drag being a reliable no-op, while the identical action via `Mod+Z`
   worked immediately. Full findings in `docs/19-testing/e2e.md`.

**Full details**: `docs/19-testing/unit.md`, `integration.md`, `e2e.md`
(all rewritten from stubs with these real findings), PLAN.md Phase 16
section (dense inline annotations matching the Phase 15 style).

See [[feedback_manual_verification]] — this phase is a second confirmation
of that rule: the `playwright.config.ts` baseURL bug and the dnd-kit
click-suppression bug were both found only by actually running Playwright
against a live dev server, not by reading code or running unit tests.
