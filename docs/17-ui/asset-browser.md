# Asset Browser

> Status: Implemented (Phase 15) — see `PLAN.md` Phase 15.5.

Confirmed as a thin view over `@motion-studio/assets`' `AssetManager`
(ADR-002) — `AssetEditorService` (`apps/studio/src/editor-kernel/services/asset-editor-service.ts`)
is a pure passthrough (`import`/`list`/`listUnused`/`delete`, no local
registry, no dedup logic). `AssetBrowserPanel` keeps its own local React
state (grid/list toggle, search string, unused-only flag) refetched via
`AssetManager.list()`/`listUnused()` on `useEngineRevisionStore` bumps
(`AssetImported`/`AssetDeleted`) — necessary because those calls are async,
unlike the synchronous engines (Timeline/Layer) other panels read straight
through selectors.

Import uses a plain `<input type="file" multiple>`, not the File System
Access API the original stub speculated about — same end-user result
(pick files, they get imported), broader browser support, no capability
detection/fallback needed.

Dragging an asset tile onto a Timeline track (via the shared `DndContext`
in `EditorShell`) calls `TimelineEditorService.addClipFromAsset`, which
creates a Layer (factory chosen by `AssetType`: Video/Image/Audio — Font
and LUT assets throw, since no Layer type maps to them) and a TrackItem in
one `CompositeCommand`, plus registers the new TrackItem as a reference
against the asset via a new `RegisterAssetReferenceCommand` (keeps
`AssetDependencyGraph`/`listUnused()` correct across undo/redo). Dragging
onto the Canvas panel is not a drop target this phase.

## Open scope — not built this phase

- Filter-by-type control (only name search + unused-only exist)
- Collections / saved filters
