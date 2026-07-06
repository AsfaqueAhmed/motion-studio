# Naming Conventions

General naming rules (classes, interfaces, hooks, stores, components, folders,
commands, intents, events) are defined once in `../STYLE_GUIDE.md` — this doc
only adds the package/file-level conventions that guide doesn't cover.

## npm workspace scope

All packages/apps are published under the `@motion-studio/` scope, one
package per folder name: `packages/timeline` → `@motion-studio/timeline`,
`apps/studio` → `@motion-studio/studio`. No nested scopes, no abbreviations.

## Source files

- Every package's only public surface is `src/index.ts` (a barrel re-export).
  Nothing outside a package may deep-import `@motion-studio/<pkg>/src/*` —
  enforced by the `no-restricted-imports` rule in `eslint.config.js`.
- One concept per file inside `src/` (e.g. `tick.ts`, `layer.ts`, `event.ts`
  in `packages/shared`), named after the concept in kebab-case, not the
  export's PascalCase name.
- Branded primitive types (`Tick`, `LayerId`, `CompositionId`, ...) live
  next to their constructor functions (`toTick`, `createLayerId`, ...) in
  the same file — never export a brand without its constructor.

## Open questions

_TODO: revisit once a package needs internal submodules (e.g.
`packages/timeline/src/commands/`) — decide whether those get their own
barrel or funnel through the root `index.ts`._
