# Coding Standards

Business-logic placement, dependency inversion, and testability rules are
defined in `../STYLE_GUIDE.md` ("Rules") and `../ARCHITECTURE.md`. This doc
records the concrete tooling that enforces (or will enforce) them.

## TypeScript (`tsconfig.base.json`)

Strict mode plus: `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`,
`noImplicitOverride`, `noFallthroughCasesInSwitch`,
`noPropertyAccessFromIndexSignature`. Every package is a TS project
(`composite: true`) referencing `../shared`, so `tsc -b` builds in
dependency order and a broken `shared` build fails downstream packages
immediately instead of silently using stale `.d.ts` output.

## Linting (`eslint.config.js`, flat config)

- `@typescript-eslint/no-explicit-any: error` — no `any`; use `unknown` with
  a type guard (CLAUDE.md "Code Standards").
- `@typescript-eslint/consistent-type-imports: error` — type-only imports
  use `import type`, keeping runtime bundles free of type-only references.
- `no-restricted-imports` blocks deep `*/src/*` imports across packages
  (see `import-rules.md`).

## Formatting

Prettier (`.prettierrc.json`) is the single source of formatting truth;
`.husky/pre-commit` runs `lint-staged` (`eslint --fix` + `prettier --write`
on staged files) so formatting/lint issues never reach a commit.

## Testing

- Unit tests: Vitest, one `vitest.config.ts` per package
  (`environment: "node"` for engine packages, `"jsdom"` for `apps/studio`),
  aggregated via the root `vitest.workspace.ts`. `passWithNoTests: true` is
  set everywhere — packages before their first real implementation phase
  are expected to have zero tests; this becomes meaningful once a package
  ships logic (its `test` script will then fail if tests regress to zero).
- E2E: Playwright (`playwright.config.ts`), scoped to `apps/studio/e2e`.
  Vitest excludes `e2e/**` so the two runners never pick up each other's
  spec files.

## Testability

Domain logic must be unit-testable without a browser (STYLE_GUIDE.md) — a
package should wrap any Web API (OPFS, WebCodecs, Web Audio, WebGPU) at its
own infrastructure boundary rather than calling it directly from logic
that needs to run under Vitest's `node` environment.

## Open questions

_TODO: 80% backend coverage threshold is stated in the parent CLAUDE.md's
sibling ecommerce project, not this one — this project has no coverage
threshold configured yet. Decide one once a package has real logic to
measure (Phase 2+)._
