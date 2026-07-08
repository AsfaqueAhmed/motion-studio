---
name: m11-ui-reskin
description: "CapCut-style Editor UI reskin (M11) — new rail/panel structure, why the Inspector became a contextual overlay, screenshot-verified"
metadata: 
  node_type: memory
  type: project
  originSessionId: a7b23342-a807-457d-ac5b-e58fc3a226bd
---

Rebuilt the Editor UI shell to match a CapCut-style reference screenshot the user
provided, on branch `m11-full-editor-ui`. Full layout rebuild (not just a color
pass), per explicit user choice.

New structure: `IconRail` (left, 9 tabs, `useRailStore`, default tab "effects") +
`LeftPanel` (switches between the restyled `AssetBrowserPanel` filtered by
`AssetType` for Videos/Photos/Audio, a new placeholder `EffectsBrowserPanel`
for Effects, and `ComingSoonPanel` for Text/Captions/Transcript/Stickers/Format)
+ redesigned `ToolbarPanel` top bar + `CanvasPanel` with a new `PlaybackBar`
underneath + restyled `TimelinePanel` (pastel per-`TrackType` clip chips, ruler,
icon-only track headers).

**Key judgment call**: the reference has no visible right-side Inspector panel,
but Motion Studio's only property-editing UI lives there. Resolved by making
`InspectorPanel` a floating overlay (`absolute right-4 top-4`) that `EditorShell`
only mounts when `selection.layerIds.length > 0` — matches the screenshot's
default (no-selection) state exactly while keeping editing fully functional.

**Why:** user explicitly requested "100% same" as the screenshot; approved
"Full layout rebuild" + "Placeholder thumbnails" + "Remove Inspector from view"
in AskUserQuestion before implementation ([[project_motion_studio]]).

**How to apply:** Effects/Captions/Transcript/Stickers/Format tabs are
intentionally non-functional placeholders — no real catalog/engine wiring
exists yet for any of them. Don't treat their presence as a sign those features
are implemented. `editing-flow.spec.ts` now clicks the rail's "Photos" tab
before importing — asset import is no longer visible on the default view.

Verified: `pnpm --filter @motion-studio/studio typecheck/lint/test` all pass,
both e2e specs pass, and the full import → drag-to-timeline → select →
Inspector-overlay flow was confirmed via real Playwright screenshots (not just
test assertions) against a manually started dev server.
