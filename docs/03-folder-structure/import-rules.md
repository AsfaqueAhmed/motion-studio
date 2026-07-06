# Import Rules

## Rule

Every engine package (`packages/core`, `storage`, `assets`, `layer`,
`timeline`, `animation`, `rendering`, `effects`, `audio`, `export`, `ai`,
`history`, `plugin`) depends on `@motion-studio/shared` only. None of them
list another engine package as a `package.json` dependency. `apps/studio`
depends on `shared` plus whichever engine packages the editor shell needs
to bootstrap (via Core's DI container) — never reaching into another
engine's internals directly (ARCHITECTURE.md §3, STYLE_GUIDE.md "Rules").

`packages/shared` has no dependencies on any other workspace package —
everything else can safely depend on it without a cycle.

## What's enforced today vs. not yet

- **Enforced (ESLint, `eslint.config.js`):** no package may deep-import
  another package's `src/` internals (`no-restricted-imports` blocks
  `*/src/*`) — every cross-package import must go through a package's
  built `index.ts` public surface.
- **Not yet enforced by tooling:** nothing currently stops a future PR from
  adding, say, `@motion-studio/rendering` as a dependency of
  `@motion-studio/timeline`'s `package.json` and importing its concrete
  classes. Today this is a code-review-time rule, not a lint-time one.

## Open questions

Package-graph enforcement (e.g. `eslint-plugin-boundaries`, or a Turborepo
dependency-graph check in CI) to make "engines only depend on `shared`"
a build failure instead of a review-time convention — not implemented yet.
Revisit once a second real cross-engine interaction exists to test the
rule against (Phase 2+).
