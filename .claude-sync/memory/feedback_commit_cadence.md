---
name: feedback-commit-cadence
description: "User wants a git commit created after every message/turn where changes are made, not batched at the end"
metadata: 
  node_type: memory
  type: feedback
  originSessionId: dbf48dfd-f612-4a16-8dd8-8c12d46aa112
---

Commit after every message where files were changed — don't batch multiple turns' worth of edits into one commit at the end of a task.

**Why:** User explicitly requested this cadence for the motion-studio project so work is checkpointed incrementally rather than losing granularity in a single large commit.

**How to apply:** After completing the work requested in a given user turn (any turn that resulted in file changes), stage and commit those changes with a descriptive message before ending the turn — don't wait for the user to ask "can you commit this?" each time. Still follow the standard git safety protocol (no destructive ops, no --no-verify, review staged files before committing). This complements [[feedback_phase_branching]] (new branch per phase) — commits happen within that branch as work progresses.
