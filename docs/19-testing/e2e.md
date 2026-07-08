# E2e

> Status: Phase 16 partially complete (2026-07-07). Real findings below replace the stub.

End-to-end testing of full user workflows.

## Scope

PLAN.md 16.3 listed three flows written against a UI that didn't fully
exist yet by the time Phase 16 started. Confirmed by actually loading the
running app (Playwright, real Chromium) rather than re-reading PLAN.md or
the Phase 15 notes:

- **No Trim UI exists anywhere.** `TrimTrackItemCommand` is unit-tested in
  `@motion-studio/timeline`, but nothing in `apps/studio` ever constructs
  or dispatches one — no Timeline panel handle, no keyboard shortcut, no
  Editor Service method.
- **No Export UI exists.** Phase 15 explicitly deferred Audio/Export/AI/
  Effects wiring (`create-editor-kernel.ts`'s doc comment) — there is no
  Export button, panel, or preset picker anywhere in the app.
- **There is no way to create a synthetic Text layer.** Every Layer in the
  running app is asset-driven
  (`TimelineEditorService.addClipFromAsset`/`createLayerForAsset`); Font
  assets are explicitly rejected from the Timeline
  (`"asset type \"Font\" cannot be placed on a Timeline"`). Nothing calls
  `AddLayerCommand` with a synthetic (non-asset) Layer.

So two of PLAN.md's three flows — "Text layer add → edit → style → export"
and "TTS generate → place on timeline → export with audio" — are **fully
blocked**, not partially: there is no drivable path through the running UI
for either, not even the non-export portion. They stay untested until a
Text tool / synthetic-layer creation UI, an Export panel, and an AI/TTS
panel exist (this was a deliberate scope decision — see the phase's
conversation record, not invented by this doc).

The third flow, "Import clip → trim → move → undo → redo → export", is
scoped down to its drivable subset and covered by
`apps/studio/e2e/editing-flow.spec.ts`: import an image asset → drag onto a
Timeline track → select it → edit a property (Opacity) in the Inspector →
move it → undo twice (move, then the property edit) → redo twice. Trim and
Export remain untested for the same reason as above.

## Two real bugs found while writing this

1. **`playwright.config.ts` had no `use.baseURL`.** Every spec (including
   the pre-existing `smoke.spec.ts`, written in Phase 15) calls
   `page.goto("/")`, which requires a `baseURL` to resolve. Without one,
   every `pnpm test:e2e` run has always failed immediately with
   `Cannot navigate to invalid URL` — this was never caught because the
   Phase 15 "verified in a real headless Chromium" claim was from ad hoc
   manual driving, not from actually running the checked-in spec file.
   Fixed by adding `use.baseURL: "http://localhost:3000"` (matching
   `webServer.url`).
2. **dnd-kit swallows the click immediately after a drag ends — globally,
   not just on the dragged element.** Browsers fire a synthetic click after
   a mouse-based drag's `pointerup`; dnd-kit suppresses exactly one such
   click to stop it from misfiring the dragged element's own click handler.
   In practice this also eats the _next real click anywhere_, e.g. on an
   unrelated toolbar button, if it happens immediately after a drop.
   Confirmed by direct comparison: clicking the Toolbar's "Undo" button
   right after the clip-move drag was a reliable no-op, while the
   _identical_ action via the `Mod+Z` keyboard shortcut worked immediately,
   and a second consecutive button click also worked. The test works
   around this with a short wait after drops that precede a click, and uses
   keyboard shortcuts (`Mod+Z`/`Mod+Shift+Z`) for undo/redo instead of the
   Toolbar buttons entirely. This is real drag-and-drop UX behavior, not an
   app bug, but it's worth knowing before writing more Timeline
   drag-and-drop E2E coverage.

## Open questions

- Which UI lands first — Trim handles, Export panel, or Text/AI tooling —
  determines which of PLAN.md's remaining two flows becomes testable
  first. Revisit this doc once any of them exists.
- Whether the dnd-kit click-suppression behavior above is ever visible to
  real users (e.g., rapidly moving a clip then immediately clicking Undo)
  is unconfirmed — it was only ever observed under Playwright's fast,
  scripted mouse events. Worth a manual check once real usage data exists.
