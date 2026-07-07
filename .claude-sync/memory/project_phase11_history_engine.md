---
name: project-phase11-history-engine
description: "Phase 11 History Engine decisions — HistoryEngine undo/redo stacks, CompositeCommand, LayoutHistoryStack separation per ADR-011, macro-recording and crash-consistency left open"
metadata: 
  node_type: memory
  type: project
  originSessionId: c0cd8590-ce94-4839-8cc6-e4e407408e69
---

Phase 11 (`packages/history`) implemented the History Engine: command-pattern
undo/redo, complete as of 2026-07-07 (commit `4459651`).

- `HistoryEngine` — two plain stacks (`undoStack`/`redoStack`), `execute()`
  pushes + clears redo, `undo()`/`redo()` throw on an empty stack (matches
  the codebase's established throw-on-invalid-state convention, later reused
  by [[project_phase12_asset_manager]]'s `AssetManager.delete()`).
  `maxDepth` (default 100) drops the oldest undo entry on overflow. Emits
  `CommandExecuted`/`CommandUndone`/`CommandRedone` through an injected
  `IHistoryEventSink` — same DI shape as Export's `IExportEventSink`.
- `ICommand` (`execute()/undo()/redo()/id/label`) already existed in
  `@motion-studio/shared` since Phase 5/6 — Timeline and Animation built
  real `ICommand`s ahead of History existing. No shape changes needed.
- `CompositeCommand` bundles a literal Command sequence (not a re-runnable
  Intent) into one undo step — the simpler/brittle option, chosen
  explicitly over macro-replay-by-Intent.
- **ADR-011: Layout undo is a separate stack.** `LayoutHistoryStack` is a
  wholly separate class/instance from `HistoryEngine`, deliberately minimal
  (tracks only the single most recent layout change, not a deep stack).
- History cleared on project load via `HistoryEngine.clear()`, but nothing
  subscribes it to `ProjectLoaded` — no engine in the codebase
  self-subscribes to another engine's events yet (verified: zero `.on(`
  calls across `packages/*/src` at the time). Left for the future Editor
  Service/Intent layer — same gap as Rendering's Render Graph wiring.

**Open decisions carried forward:**
- Macro recording granularity (Intent-based replay vs. literal Command
  sequence) — not decided beyond `CompositeCommand`'s "one undo step" case.
- Crash consistency mid multi-command fan-out — not designed; `CompositeCommand`
  is a plain in-memory wrapper, not a transaction with rollback.

See [[project_architecture_rules]], [[feedback_phase_branching]].
