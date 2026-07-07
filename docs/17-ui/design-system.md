# Design System

> Status: Minimal implementation (Phase 15) — see `PLAN.md` Phase 15.1.

Dark-only theme (no light mode/theme-switching this phase). Tokens live in
`apps/studio/tailwind.config.ts` under the `editor.*` namespace:

| Token                   | Value     | Used for                                   |
| ----------------------- | --------- | ------------------------------------------ |
| `editor-bg`             | `#151517` | App/panel background                       |
| `editor-surface`        | `#1e1e21` | Panel chrome (toolbar, headers)            |
| `editor-surface-raised` | `#26262a` | Buttons, hovered rows                      |
| `editor-border`         | `#333338` | Panel/row dividers                         |
| `editor-text`           | `#e4e4e7` | Primary text                               |
| `editor-text-muted`     | `#8b8b93` | Secondary/disabled-looking text            |
| `editor-accent`         | `#5b8cff` | Selection highlight, active tool, playhead |

`darkMode: "class"` + `<html className="dark">` (`app/layout.tsx`) — no
actual light-mode stylesheet exists, the class is set unconditionally.

## PWA shell

`public/manifest.json` (name, standalone display, theme/background colors
matching `editor-bg`) + a hand-rolled `public/sw.js` — no `next-pwa`/Workbox
dependency. Precaches `/` and `/manifest.json` on install; cache-first for
other same-origin GET requests; network-first-with-cache-fallback for
navigations. Registered from a small client component
(`app/register-service-worker.tsx`) mounted in the root layout.

## Open scope — not built this phase

- Light theme / theme switching
- Design tokens beyond color (spacing/typography scale not formalized —
  panels use ad hoc Tailwind utility values)
