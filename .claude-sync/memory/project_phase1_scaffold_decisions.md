---
name: project-phase1-scaffold-decisions
description: "Design choices made during Phase 1 scaffold where docs/ were stub-only, now de facto convention"
metadata: 
  node_type: memory
  type: project
  originSessionId: 97ed0ea2-fdf9-4777-80f7-36979168aa5d
---

Several `docs/03-folder-structure/*.md` and per-engine spec files were pure
stubs ("Status: Stub") when Phase 1 was implemented, so these choices were
made without explicit spec backing and should be treated as the accepted
convention going forward (not re-litigated) unless the user objects:

- **npm scope:** `@motion-studio/<package-folder-name>`, one package per
  workspace folder, no abbreviations.
- **Per-engine `I*Engine` interfaces** (in `packages/shared/src/engine.ts`)
  are intentionally minimal — just `IEngine { name, initialize, ready, dispose }`
  aliased per engine — since no doc specifies engine-specific public methods
  yet. Don't add methods to these speculatively; extend only when a real
  engine (Phase 2+) needs a documented method.
- **`ExportPreset`** enum currently has exactly one member
  (`Preset1080p30H264Opus`), matching the MVP's single vertical-slice
  preset. Don't pre-populate more presets until the roadmap calls for them.
- **Import boundaries** are enforced only partially: ESLint blocks deep
  `*/src/*` imports, but nothing yet stops an engine package from adding
  another engine package as a dependency in `package.json` (see
  `docs/03-folder-structure/import-rules.md` "Open questions"). This is a
  known, accepted gap — revisit once a second real cross-engine interaction
  exists to test a boundary rule against.
- **Testing:** every package's `vitest.config.ts` sets `passWithNoTests: true`
  because Phase 1 packages are intentionally empty (`export {}`) stubs.
  When a package gets its first real implementation, that flag stops being
  a no-op and starts being a real safety net against test regressions —
  don't remove it prematurely, but do treat "0 tests" as a smell once a
  package has actual logic.

**Why this matters:** the next session picking up Phase 2+ shouldn't
re-derive these from scratch or second-guess them as arbitrary — they were
deliberate, documented calls made to fill gaps CLAUDE.md/PLAN.md/docs left
open. See [[project_motion_studio]] for overall status.
