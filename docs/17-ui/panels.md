# Editor Core, Workspace & Intent Layer

Covers the editor's orchestration layer (formerly split across
"Editor Core" and "Workspace" drafts) — the layer between React and the
Core Engines. **This is where the canonical Intent Layer lives** — see
`../DECISIONS.md` ADR-001; do not redefine it in `shortcuts.md` or
elsewhere, reference this file instead.

## The Editor Kernel

One instance per running editor. Owns: services, engines, workspace,
command bus, event bus, plugins, settings. Contains no rendering logic,
no timeline logic — it coordinates.

## Editor State vs. project state — strict separation

```
Project data (Timeline, Layers, Animations) → lives in the Core Engines
UI-only state (active tool, selection, zoom, viewport, playback state,
  workspace layout, theme, language) → lives in Editor State
```

Never mix these. Project state is what gets saved; Editor State is
ephemeral/per-session (with workspace layout persisted separately, per-
user, project-independent — see `docking.md`).

## The Intent Layer (canonical)

```
User input (keyboard/toolbar/menu/gesture/AI/plugin/macro)
        │
        ▼
     Intent                 ("delete the selection" — WHAT, not HOW)
        │
        ▼
  Editor Service            (resolves into 1+ concrete commands)
        │
        ▼
   Command(s)  ──────────► Command Bus ──────────► Core Engines
```

Example: `DeleteSelectionIntent` resolved by `SelectionService` into
`DeleteTimelineItemsCommand` + `DeleteLayersCommand` +
`RemoveAnimationsCommand` + a history push — one user action, several
coordinated typed commands.

Why this layer exists: keyboard shortcuts, toolbar buttons, context
menus, gestures, and AI assistants can all trigger the _same_ intent
without duplicating business logic across five different UI entry
points. It's also the natural seam for macro recording and (later)
collaborative editing.

## Services

Fifteen-ish core services (Project, Workspace, Timeline, Selection,
Animation, Playback, Media, Asset, Audio, Export, AI, Plugin, Shortcut,
Settings, Theme), each with a single responsibility, resolved through
dependency injection at startup (no global singletons).

**Open item:** services must be a thin façade over Command Bus calls,
not a second place holding coordination logic that duplicates what
Command Bus handlers already do — draw this line explicitly per service
as they're implemented, rather than letting "service logic" grow
informally.

## Workspace (panels/docking)

Every visible panel (Canvas, Timeline, Inspector, Layers, Assets, etc.)
is a plugin-like module registered with the Workspace Engine. Layout is
a tree of Split/Stack/Panel nodes. See `docking.md` for the docking
system itself.

## Canvas System (viewport & interaction)

The Canvas hosts the actual editing surface — camera (`ViewportCamera`,
see `../GLOSSARY.md`), viewport, pointer/gesture handling, selection
overlay, transform handles, smart guides, snapping. Built as an
independent engine that React only mounts, not as a React component
tree, for responsiveness. Canvas's hit-testing and culling must call
into the Selection Engine and Rendering Engine's existing spatial index
rather than maintaining a third independent one — see
`../DECISIONS.md` ADR-004 and the hit-testing note in `toolbar.md`.

## Crash recovery / autosave — open item

"Unexpected close → snapshot → restart → restore" is asserted without
specifying exactly when snapshots are taken or whether recovered state
is guaranteed consistent after a crash mid multi-command operation. See
`../15-history/overview.md` and `../DECISIONS.md` "Open risks."
