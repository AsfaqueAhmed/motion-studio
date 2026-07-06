# System Architecture Overview

See `../ARCHITECTURE.md` for the one-page map. This document expands the
layering and dependency rules referenced there.

## Layering (applies inside every engine package)

```
Presentation   (React components, panel UI — only in 17-ui/)
     ↓
Application    (use cases / command handlers, orchestrates Domain objects)
     ↓
Domain         (business rules — never imports React, never imports a
                 browser API directly)
Infrastructure (repositories, storage adapters, browser API wrappers —
                 implements interfaces defined by Domain)
```

Dependencies point inward only. Infrastructure implements interfaces
_defined by_ Domain; it never gets imported by Domain directly.

## Cross-engine communication

Only three channels are allowed between engines:

1. **Command Bus** — typed, undoable mutations. The only way project
   state changes.
2. **Query Bus** — read-only lookups (e.g. `GetLayer()`, `GetSelection()`).
   Never mutates.
3. **Event Bus** — coarse-grained notifications after something happened
   (`LayerSelected`, `ExportFinished`). **Not** for the per-frame hot
   path — the Scheduler drives per-frame evaluation with direct calls,
   not events, to avoid dispatch overhead at 60fps+.

No engine ever holds a direct reference to another engine's concrete
class. Everything is resolved through the Core Engine's registry against
an `I`-prefixed interface.

## Module boundary rule of thumb

If you're about to write `import { X } from '../other-engine/...'` where
`X` is a concrete class (not an interface), stop — that's the dependency
rule being broken. The one legitimate exception is depending on another
engine's public `I*` interface package for type information.

## Where this gets non-trivial

A few real, unresolved coordination problems that don't fit neatly into
"just use the event bus":

- **Evaluation ordering** across Animation (blending), Constraints
  (Follow/Parent), and Expressions all need dependency-ordered
  evaluation with cycle detection — the same underlying problem in three
  places. See `DECISIONS.md` ADR-005.
- **Frame State's incremental evaluation** — the Scheduler's per-frame
  pipeline (Animation → Timeline → Selection → Audio → Render) needs to
  avoid full re-evaluation every frame at scale; this needs an actual
  dirty-tracking design, not just an assertion that it'll be fast.
