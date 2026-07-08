---
name: feedback-manual-verification
description: "User now checks UI changes manually — don't spin up temporary Playwright scripts to self-verify"
metadata: 
  node_type: memory
  type: feedback
  originSessionId: a7b23342-a807-457d-ac5b-e58fc3a226bd
---

Don't write ad-hoc/temporary Playwright scripts (screenshotting, clicking
through flows, sampling pixel data) to self-verify a UI change works. Run
typecheck/lint/existing test suites as normal, and start the dev server if the
user needs it running — but stop short of writing one-off verification
scripts (e.g. `scripts/tmp-*.mjs`). Leave the actual UI check to the user.

**Why:** this was flipped from the opposite rule (always self-verify UI in a
real browser) after several rounds of temporary Playwright screenshot/check
scripts during the M11 CapCut-style UI reskin ([[project_m11_ui_reskin]]) —
the user asked to check every change themselves from now on instead.

**Prior context, still useful background:** the original reason for
self-verifying was that during Phase 15 (Editor UI), all unit tests and
typecheck/lint passed clean, but manual Playwright testing caught a real bug
tests couldn't: dnd-kit's default `PointerSensor` had no activation distance,
so a plain click on a Timeline clip registered as a zero-distance drag,
silently pushing a no-op `MoveTrackItemCommand` onto the undo stack. That
class of bug (interaction-layer only, no console error) is still real — it's
just the user's job to catch now, not something to proactively script around
with temporary Playwright runs.

**How to apply:** For apps/studio UI work, after tests pass, report the change
as ready for the user to check rather than opening a browser automation
script yourself. If the user asks you to verify something specific, or the
change is high-risk/hard for them to exercise, that's a reasonable exception
worth asking about rather than assuming.
