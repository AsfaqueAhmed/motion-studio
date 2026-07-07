# Docking

> Status: Partially implemented (Phase 15) — see `PLAN.md` Phase 15.1.

## What's actually built

Phase 15 deliberately did **not** build the dockable Split/Stack/Panel tree
this file originally speculated about. `apps/studio/src/components/editor-shell.tsx`
lays out Toolbar/Asset Browser/Canvas/Inspector/Timeline in a **fixed CSS
grid** — no dragging, no resizing, no floating panels, no workspace
presets, and no layout-undo stack (ADR-011 is therefore not applicable yet:
there's no layout tree to undo).

This was a scope decision, not an oversight: building a real docking engine
(tree model, drag-to-dock affordances, persistence, the separate undo
stack ADR-011 calls for) is a substantial project on its own, and none of
Phase 15's five panels needed it to become real and testable end-to-end.

## Open scope — deferred to its own future pass

- Split/Stack/Panel tree data model
- Drag-to-dock, resizing, floating panels
- Workspace presets, per-user persistence (project-independent, per
  `panels.md`'s "Editor State vs. project state" split)
- `LayoutHistoryStack` / ADR-011 (separate undo stack for layout changes)

## Open questions

- Should the tree model be one of the three generic graph primitives from
  ADR-005, or does panel docking need a fourth, genuinely different shape?
  Not yet evaluated — no implementation exists to judge against.
