# Command System, Shortcuts & Command Palette (canonical)

Keyboard shortcuts are one of several ways to invoke a Command — never
a separate code path. This is the same architecture used by VS Code,
Figma, Blender, Photoshop.

**Intent Layer lives in `panels.md`, not here** — see
`../DECISIONS.md` ADR-001. This doc covers everything downstream of an
Intent: the typed Command Bus, shortcut binding, the command palette,
and macros.

## Full pipeline (one path, every input source)

```
Keyboard / Toolbar / Menu / Gesture / AI / Plugin / Macro / API
        │
        ▼
     Action        { id, source, intent, payload, timestamp }
        │
        ▼
     Intent        (see panels.md — resolved by an Editor Service)
        │
        ▼
  Typed Command(s) ──► Command Bus ──► History Engine + Core Engines ──► Event Bus
```

Every interaction is therefore replayable, undoable, macro-recordable,
auditable, and equally accessible to a human or an AI assistant,
regardless of how it was triggered.

## Typed commands (not string-keyed)

```typescript
interface DeleteSelectionCommand {
  selectionIds: string[];
}
commandBus.execute(new DeleteSelectionCommand(selection));
```

Compile-time checked, better refactoring safety, safer plugin API,
versus `execute("delete")`.

## Shortcut system

- **Scope-based priority**: Focused Input → Modal → Active Panel →
  Workspace → Global. Only the active scope receives the event.
- **Multiple bindings** can map to one command (`Delete` and
  `Backspace` both → `DeleteCommand`).
- **Chords** supported (`Ctrl+K, Ctrl+P`).
- **Conflict detection** on registration — no silent overrides; the
  registrar is warned and must resolve.
- Per-platform keymap defaults (Windows/macOS/Linux), user-customizable.

## Command Palette

`Ctrl+Shift+P`-style fuzzy search over title/keywords/category/alias,
with recency/frequency-based ranking. Plugin-registered commands are
immediately searchable — no special casing.

## Macros

Every executed command can be recorded and replayed. **Open decision**
(see `../15-history/overview.md`): record the high-level Intent (robust
to minor state differences on replay) or the literal Command sequence
(exact, more brittle)? Needs to be decided before implementing.

## AI integration

AI never mutates state directly — it issues Commands through this same
bus, so every AI action is undoable and indistinguishable, from the
History Engine's point of view, from a human-triggered edit.
