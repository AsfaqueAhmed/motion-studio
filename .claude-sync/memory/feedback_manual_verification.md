---
name: feedback-manual-verification
description: Always drive real UI flows in a browser before declaring a UI phase/feature done — typecheck/lint/unit tests miss interaction-layer bugs
metadata: 
  node_type: memory
  type: feedback
  originSessionId: 66fa26d6-b112-4199-8deb-fa0a6d1e3f77
---

For any UI-touching phase in Motion Studio, drive the actual feature in a
real browser (Playwright against a running dev server, or `chromium-cli`)
before reporting it complete — don't stop at typecheck/lint/unit tests
passing.

**Why:** During Phase 15 (Editor UI), all 37 new unit tests passed and
typecheck/lint/build were clean, but manual Playwright testing found a
real bug unit tests couldn't have caught: dnd-kit's default `PointerSensor`
has no activation distance, so a plain click on a Timeline clip registered
as a completed zero-distance drag, silently pushing a no-op
`MoveTrackItemCommand` onto the undo stack and swallowing the click event
meant for selection. Undo then reverted the spurious no-op move instead of
the user's actual last edit — completely invisible to any test that
doesn't literally click a rendered clip and check what happens. Only
caught by taking screenshots and sampling actual canvas pixel data /
button states after real pointer interactions.

**How to apply:** For any apps/studio UI work, after tests pass: start the
dev server, use Playwright (or `chromium-cli` if available) to drive the
actual user-facing flow end-to-end (not just "page loads"), take
screenshots, and check state after each interaction (not just "no console
errors" — that alone missed this bug too, since dnd-kit doesn't throw).
Prefer verifying claims like "the rendering pipeline draws pixels" by
sampling actual pixel data, not just confirming no exception was thrown.
