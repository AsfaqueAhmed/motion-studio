---
name: project-phase15-editor-ui
description: "Phase 15 Editor UI (apps/studio) decisions — EditorKernel integration layer, Command Bus, Editor Services, panels, real dnd-kit click-vs-drag bug found via manual browser testing"
metadata: 
  node_type: memory
  type: project
  originSessionId: 66fa26d6-b112-4199-8deb-fa0a6d1e3f77
---

Phase 15 (Editor UI, `apps/studio`) is complete, built on branch
`phase-15-editor-ui` off `phase-14-plugin-system`. This is the first time
any code assembles the engine packages into a running app — the
"integration layer" every phase since 7 flagged as missing.

**Scope decisions (confirmed with user via AskUserQuestion before
implementing):**
- `EditorKernel`/`createEditorKernel` (`apps/studio/src/editor-kernel/`)
  wires only the 8 engines the Phase 15 panels touch: Storage, Assets,
  Layer, Timeline, Animation, History, Plugin, plus `RenderingEngine`
  (owned separately by `CanvasPanel`, not `AppEngine`, since it needs a
  real `<canvas>`). Audio/Export/AI/Effects deliberately not constructed —
  no panel needs them yet.
- Panel layout is a fixed CSS grid (`EditorShell`) — no dockable
  Split/Stack/Panel tree, no layout-undo (ADR-011 not applicable yet).

**New architecture pieces (didn't exist anywhere before this phase):**
`CommandBus` (thin wrapper over `HistoryEngine.execute`), Editor Services
(`TimelineEditorService`, `InspectorEditorService`, `AssetEditorService`,
`PlaybackService`), `ToolRegistry` (first real `IToolAPI` impl, wired as
`PluginEngine`'s `hostApi.tools`), `PropertySchemaRegistry` (reuses
`AnimatablePropertyRegistry` as source of truth, adds only UI concerns),
`frame-state-builder.ts` (Timeline+Animation+Layer → Frame State glue),
`render-backend-factory.ts` (real WebGPU→WebGL2→Canvas2D→Software fallback
construction against an actual `<canvas>`), a browser-API-backed
`IMetadataExtractor` (createImageBitmap/`<video>`/AudioContext/hand-rolled
SFNT `name`-table parsing for fonts — first concrete impl of that
interface anywhere), new Commands (`AddLayerCommand`/`AddTrackItemCommand`/
`UpdateLayerCommand`/`AddAnimationClipCommand`/`AddPropertyTrackCommand`/
`RegisterAssetReferenceCommand` — Layer package had zero Commands before
this).

**Real bug found via manual Playwright verification (not just unit
tests):** dnd-kit's default `PointerSensor` has no activation distance, so
a plain click on a clip registered as a completed zero-distance drag,
silently pushing a no-op `MoveTrackItemCommand` onto the undo stack and
eating the click event meant for selection — Undo then reverted the
spurious no-op move instead of the user's actual last edit. Fixed with
`activationConstraint: {distance: 4}` on the `PointerSensor` plus a
same-position/same-track guard in `handleDragEnd` as a backstop. This is
the kind of bug that only manual browser testing catches, not typecheck/
lint/unit tests — see [[feedback_manual_verification]] if that memory
exists, otherwise worth creating: always drive real UI flows in a browser
before declaring a UI phase done, per the `verify`/`run` skills.

**Verified end-to-end in real headless Chromium (Playwright, not just "no
console errors" — sampled actual canvas pixel data to confirm the
RenderingEngine pipeline draws real pixels):** import an image asset → drag
onto Timeline track → clip appears → click to select → Inspector shows
full property schema with keyframe diamonds → drag to move → Undo removes
clip → Redo restores it.

**Deferred/open (documented in PLAN.md Phase 15 and docs/17-ui/*.md):**
real docking engine, Command Palette, Macro recording, transform handles,
multi-select (shift-click/drag-box), snapping, thumbnail/waveform clip
rendering (no decoder pipeline exists), true Timeline virtualization,
Tool sessions/Interaction Pipeline for tools beyond Select, ADR-010
(delete cascade to Layers/Animation) still unresolved — `DeleteSelectionIntent`
only removes TrackItems.

37 new unit tests, all passing. Full monorepo build/typecheck/lint/test
(25 workspace tasks) green.
