# Project Structure

Monorepo managed with pnpm workspaces + Turborepo (`pnpm-workspace.yaml`,
`turbo.json`). Every package/app builds, lints, typechecks, and tests
independently through Turbo's task graph; `build`/`lint`/`typecheck` depend
on `^build` so a package always sees its workspace dependencies' compiled
`dist/` output, never their `src/`.

```
motion-studio/
  packages/
    shared/        # @motion-studio/shared — cross-engine types, no framework deps, no deps on other packages
    core/          # @motion-studio/core     (04-core)
    storage/       # @motion-studio/storage  (12-storage)
    assets/        # @motion-studio/assets   (14-assets)
    layer/         # @motion-studio/layer    (08-layer-engine)
    timeline/      # @motion-studio/timeline (07-timeline-engine)
    animation/     # @motion-studio/animation (06-animation-engine)
    rendering/     # @motion-studio/rendering (05-rendering-engine)
    effects/       # @motion-studio/effects  (09-effects-engine)
    audio/         # @motion-studio/audio    (10-audio-engine)
    export/        # @motion-studio/export   (13-export)
    ai/            # @motion-studio/ai       (11-ai)
    history/       # @motion-studio/history  (15-history)
    plugin/        # @motion-studio/plugin   (16-plugin-system)
  apps/
    studio/        # @motion-studio/studio — Next.js 14 App Router editor shell (17-ui)
```

Each engine package (all but `shared`) depends on `@motion-studio/shared`
for the `I`-prefixed interfaces, enums, and value types it needs to talk to
other engines — never on another engine package directly (ARCHITECTURE.md
§3). `apps/studio` depends on `shared` and, as engines are implemented,
consumes them only through the Intent/Command/Event layer, never by
importing an engine's concrete class (see `import-rules.md`).

## Per-package layout

```
packages/<name>/
  src/
    index.ts        # public entry point — the only thing other packages may import
  package.json
  tsconfig.json      # extends ../../tsconfig.base.json, references ../shared
  vitest.config.ts
```

`apps/studio` additionally has `src/app/` (Next.js App Router), `next.config.js`,
`tailwind.config.ts`, `postcss.config.js`, and `e2e/` (Playwright specs, run via
the root `playwright.config.ts`).

## Root-level config

- `tsconfig.base.json` — shared strict TypeScript config every package extends.
- `eslint.config.js` — flat config (ESLint 9), shared by all packages.
- `.prettierrc.json` / `.prettierignore` — formatting.
- `.husky/pre-commit` — runs `lint-staged` (eslint --fix + prettier on staged files).
- `vitest.workspace.ts` — discovers every package's `vitest.config.ts`.
- `playwright.config.ts` — e2e tests, currently scoped to `apps/studio/e2e`.

## Open questions

None currently — this reflects Phase 1 (Sprint 1, item 1) as implemented.
Revisit if package boundaries change (e.g. a package needs splitting) or a
new app is added.
