# Style Guide

## Naming

| Kind       | Convention                    | Example                            |
| ---------- | ----------------------------- | ---------------------------------- |
| Classes    | PascalCase                    | `TimelineEngine`                   |
| Interfaces | `I`-prefixed PascalCase       | `IProjectRepository`               |
| Enums      | PascalCase                    | `AnimationType`                    |
| Hooks      | `use`-prefixed camelCase      | `useTimeline()`                    |
| Stores     | `use...Store`                 | `useTimelineStore()`               |
| Components | PascalCase, `.tsx`            | `TimelinePanel.tsx`                |
| Folders    | kebab-case                    | `timeline-engine/`                 |
| Commands   | PascalCase + `Command` suffix | `DeleteLayerCommand`               |
| Intents    | PascalCase + `Intent` suffix  | `DeleteSelectionIntent`            |
| Events     | PascalCase, past tense        | `LayerSelected`, `PlaybackStarted` |

Canonical term usage: see `GLOSSARY.md`. Do not introduce a new synonym
for `Layer`, `Composition Graph`, `Scene Graph`, `ViewportCamera`,
`SceneCamera`, `AnimatablePropertyRegistry`, or `PropertySchemaRegistry` —
use the defined terms exactly.

## Rules

- No business logic inside UI components — components dispatch Intents
  and render state, nothing else.
- No direct IndexedDB/OPFS access from UI or from any engine other than
  Storage — always through the VFS.
- No renderer logic inside Timeline, and no Timeline logic inside the
  Renderer.
- No AI code inside the Renderer.
- No component larger than ~300 lines — split it.
- Prefer composition over inheritance.
- All domain logic must be unit-testable without a browser environment
  where possible (i.e., don't couple domain logic directly to a specific
  Web API — wrap the API at the infrastructure boundary).
- Use dependency inversion between engines: depend on the `I`-prefixed
  interface, resolve the concrete implementation through the
  registry/DI container, never `import` another engine's concrete class
  directly.
- Every engine states, in its own overview doc, what it owns and what it
  explicitly never does (see any `NN-engine-name/overview.md` for the
  pattern) — keep this up to date as the engine evolves.

## Time and numbers

- Internal time representation is always integer **ticks**, never
  floating-point seconds. See `GLOSSARY.md`.
- Every performance goal stated anywhere in this repo should have an
  actual number and a reference hardware/browser context — "fast" or
  "real-time" alone is not a spec. Where a number is missing, that's a
  known gap — check `DECISIONS.md` "Open risks."

## Documentation

- Every engine/subsystem doc should have, at minimum: what it owns, what
  it explicitly never does, its public API surface, and any open
  questions.
- If two docs appear to describe the same subsystem, that's a bug in the
  documentation — check `DECISIONS.md` first; if it's not already
  resolved there, raise it before writing more content on top of the
  ambiguity.
