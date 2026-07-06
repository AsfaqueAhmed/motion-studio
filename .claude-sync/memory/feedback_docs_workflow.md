---
name: Docs update workflow
description: How to handle the docs/ stub files during development
type: feedback
---

Fill stub docs as each engine/phase is built — replace `> Status: Stub` placeholders with real specs, findings, and decisions.

**Why:** The docs/ folder is the architecture corpus and should stay in sync with what's actually implemented, not remain speculative.

**How to apply:** When implementing a phase, update the corresponding `docs/NN-*/overview.md` (and relevant sub-docs) with real API shapes, open questions resolved, and any deviations from the original spec. Spike deliverables (e.g. `docs/13-export/webcodecs.md`, `docs/11-ai/`) are the first examples of this pattern.
