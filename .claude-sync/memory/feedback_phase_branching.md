---
name: feedback-phase-branching
description: Create a new git branch named after the phase when starting each PLAN.md phase
metadata: 
  node_type: memory
  type: feedback
  originSessionId: 97ed0ea2-fdf9-4777-80f7-36979168aa5d
---

Create a new git branch (named after the phase, e.g. `phase-2-core-engine`)
at the start of each PLAN.md phase, rather than committing phase work
directly to `main`.

**Why:** User explicitly asked for this workflow after Phase 1 (monorepo
scaffold) was committed straight to `main`. Each phase should be isolable
on its own branch.

**How to apply:** Before starting implementation work for a new phase
(Phase 2 — Core Engine, Phase 3 — Storage Engine, etc. per PLAN.md), branch
off first: `git checkout -b phase-N-<short-name>`. Use a slug derived from
the phase's PLAN.md heading (e.g. "Phase 2 — Core Engine" → `phase-2-core-engine`).
Confirm with the user whether/when to merge back to `main` — this memory
only covers branch creation, not merge strategy, which hasn't been
specified yet.
