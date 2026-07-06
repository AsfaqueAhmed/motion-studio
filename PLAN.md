# Motion Studio — Implementation Plan

> Read `CLAUDE.md` before touching any code. Read `docs/ARCHITECTURE.md`,
> `docs/DECISIONS.md`, `docs/GLOSSARY.md` before naming anything.

---

## Phase 0 — Spikes (mandatory gate before Phase 1)

These two spikes de-risk the two biggest unknowns in the entire project.
**Do not start Phase 1 until both produce written findings.**

### Spike A — Export pipeline ✅ complete (2026-07-06)

**Goal:** Prove WebCodecs → mux → playable file works end-to-end.

- [x] Decode a short video clip with `VideoDecoder` (via Mediabunny's `VideoSampleSink`, see `docs/13-export/muxer.md`)
- [x] Draw frames to `OffscreenCanvas` (simulated render)
- [x] Encode frames with `VideoEncoder` (H.264)
- [x] Encode audio with `AudioEncoder` (Opus first, then AAC — AAC unsupported on Firefox, confirmed)
- [x] Mux into MP4 (via **Mediabunny**, not `mp4-muxer` — see ADR-012 in `docs/DECISIONS.md`)
- [x] Play back result in `<video>` tag
- [x] Test on Chromium, Firefox, WebKit (Playwright engines — real Edge/Safari not separately tested, see `webcodecs.md`)
- [x] **Document findings** in `docs/13-export/webcodecs.md` and `docs/13-export/muxer.md`

**Pass criteria met:** playable MP4 with H.264 + Opus produced on all three engines tested.

---

### Spike B — In-browser TTS ✅ complete (2026-07-06)

**Goal:** Confirm real model size, load time, generation speed, and actual pipeline shape.

- [x] Load Kokoro-82M via ONNX Runtime Web (`kokoro-js`)
- [x] Measure cold load time (first page load, no cache): 84.3s (WASM/q8), 282.0s (WebGPU/fp32)
- [x] Measure warm load time (model cached): 0.5s (WASM/q8), 0.65s (WebGPU/fp32)
- [x] Measure generation time for a ~10-second sentence: 14.1s (WASM/q8, warm)
- [x] Compare WebGPU execution provider vs. WASM execution provider (WebGPU result looks environment-limited — see caveat in `docs/11-ai/kokoro.md`)
- [x] Record actual downloaded model size: 92.36 MB (`q8`), 325.53 MB (`fp32`)
- [x] Confirm: single end-to-end ONNX graph confirmed (not a multi-stage pipeline)
- [x] **Document findings** in `docs/11-ai/kokoro.md`, `piper.md`, `overview.md`

**Pass criteria NOT fully met:** pipeline shape confirmed, but generation
was 14.1s for a 10s sentence (target: <5s). This is an open gap — see
"Open questions" in `docs/11-ai/kokoro.md` before Phase 1 commits to a TTS
UX built around near-instant generation.

---

## Phase 1 — Project scaffold

### 1.1 Monorepo setup

- [x] Initialize pnpm workspace with Turborepo
- [x] TypeScript strict mode, shared `tsconfig.base.json`
- [x] ESLint + Prettier + Husky + lint-staged
- [x] Vitest for unit tests, Playwright for e2e
- [x] Package layout:
  ```
  packages/
    core/          # Core Engine (kernel, DI, scheduler, event bus, workers)
    storage/       # VFS, IndexedDB, OPFS
    assets/        # Asset manager
    layer/         # Layer Engine
    timeline/      # Timeline Engine
    animation/     # Animation Engine
    rendering/     # Rendering Engine (WebGPU/WebGL2/Canvas2D)
    effects/       # Effects Engine
    audio/         # Audio Engine
    export/        # Export Engine
    ai/            # AI Engine
    history/       # History / undo-redo
    plugin/        # Plugin system
    shared/        # Shared types, interfaces, enums, constants
  apps/
    studio/        # Next.js app (Editor UI)
  ```

### 1.2 Shared types package (`packages/shared`)

- [x] `Tick` type (branded integer, never `number | float`)
- [x] `FrameState` interface (immutable snapshot)
- [x] `ILayer` base interface + discriminated union for all layer types
- [x] `ICommand` interface (`execute / undo / redo`)
- [x] `IIntent` interface
- [x] `IEvent` base + typed event catalog
- [x] All enums: `LayerType`, `TrackType`, `ExportPreset`, `PlaybackState`, etc.
- [x] All `I`-prefixed engine interfaces (one per engine)

---

## Phase 2 — Core Engine (`packages/core`) ✅ complete (2026-07-06)

### 2.1 Kernel & DI

- [x] `AppEngine` — top-level bootstrap, owns engine lifecycle
- [x] Lightweight DI container (constructor injection, no decorators required)
- [x] `ServiceLocator` — global registry for resolved engine instances
- [x] Engine lifecycle: `initialize() → ready() → dispose()`

### 2.2 Event Bus

- [x] Typed `EventBus` (publish/subscribe, synchronous + async variants)
- [x] All events strongly typed against the shared event catalog
- [x] No wildcard subscriptions — every listener declares its exact event type

### 2.3 Scheduler

- [x] `raf`-based tick scheduler for preview loop
- [x] Tick → frame number conversion utility (respects project tick resolution)
- [x] Pause/resume/seek

### 2.4 Worker Manager

- [x] `WorkerManager` — owns all dedicated workers, routes messages
- [x] Workers never communicate directly with each other (always via Core)
- [x] Initial worker slots: rendering, export, ai-inference, thumbnail-gen

---

## Phase 3 — Storage Engine (`packages/storage`) ✅ complete (2026-07-06)

### 3.1 VFS abstraction

- [x] `IVFS` interface — `read / write / delete / exists / list`
- [x] IndexedDB adapter (structured/small data: project JSON, settings, thumbnails)
- [x] OPFS adapter (large binaries: media files, AI models, exports)
- [x] `StorageEngine` — routes reads/writes to correct adapter via path convention

### 3.2 Project persistence

- [x] Project schema v1 (Composition, Tracks, TrackItems, Layer refs)
- [x] `save(project)` / `load(projectId)` / `list()` / `delete(projectId)`
- [x] **Backup-before-migrate** step (write backup before any schema migration — open risk) — backup half done; restore/rollback API still open, see `docs/12-storage/project-schema.md`
- [x] Schema version field + migration runner

### 3.3 Asset cache

- [x] Asset blob storage in OPFS (keyed by content hash for dedup)
- [x] Thumbnail cache (IndexedDB, keyed by `assetId + timestamp`)
- [x] Waveform cache (IndexedDB)

---

## Phase 4 — Layer Engine (`packages/layer`) ✅ complete (2026-07-06)

### 4.1 Base layer

- [x] `ILayer` base (id, type, name, transform, opacity, visible, locked) — was already scaffolded in `@motion-studio/shared` (Phase 1); `parentId` added for Composition Graph
- [x] `IAnimatableLayer` — layers that participate in keyframe animation (currently an alias for `ILayerBase` — every layer type qualifies today; see `docs/08-layer-engine/overview.md`)
- [x] `Composition Graph` primitive — persistent parent/child hierarchy with visibility/lock inheritance (`CompositionGraph`, built on the generic `Hierarchy<TId>` primitive in `@motion-studio/shared`, ADR-005 #2)

### 4.2 Layer types (implement in this order)

- [x] `VideoLayer` (source assetId, in/out points, playback rate) — in/out points live on Timeline's `TrackItem`, not the Layer, per ARCHITECTURE.md §3
- [x] `TextLayer` (content, font, size, color, alignment, wrapping) — wrapping/kerning/stroke/shadow/gradient deferred, see `docs/08-layer-engine/text-layer.md` open questions
- [x] `ImageLayer` (source assetId, fit mode)
- [x] `ShapeLayer` (path, fill, stroke, corner radius) — polygon/star point counts and bezier path data not yet modeled, see doc
- [x] `AudioLayer` (source assetId, volume, in/out points) — in/out points on `TrackItem`, as above
- [x] `GroupLayer` (children: LayerId[], Composition Graph node)

---

## Phase 5 — Timeline Engine (`packages/timeline`) ✅ complete (2026-07-06)

### 5.1 Data model

- [x] `Composition` (id, name, width, height, fps, durationTicks, tracks[])
- [x] `Track` (id, type, label, locked, muted, items[])
- [x] `TrackItem` (id, trackId, layerId, startTick, durationTicks, trimInTick, trimOutTick)
- [x] All temporal values in integer **Ticks** — no floats

### 5.2 Playback

- [x] Tick-based playhead (integer only) — `Playhead`, driven externally by Core's `Scheduler` rather than running its own raf loop, see `docs/07-timeline-engine/playback.md`
- [x] `play() / pause() / seek(tick) / stop()`
- [x] Loop in/out points
- [x] Frame-step forward/back

### 5.3 Edit operations (all go through History as Commands)

- [x] Move TrackItem (`MoveTrackItemCommand`)
- [x] Trim in/out (`TrimTrackItemCommand`) — single-item trim only; ripple trim/slip/slide not implemented, see `docs/07-timeline-engine/trimming.md`
- [x] Split at playhead (`SplitTrackItemCommand`)
- [x] Delete (`DeleteTrackItemCommand`)
- [x] Ripple delete/insert (`RippleDeleteCommand`) — ripple delete only (no insert), single-track only; **ADR-010 still open**, cross-track linked-item ripple deferred until `ITrackItem` models linking, see `docs/07-timeline-engine/ripple.md`
- [x] Snapping (to playhead, to other clip edges, to grid) — pure calculation (`snapping.ts`), not a Command; markers/guides deferred, see `docs/07-timeline-engine/snapping.md`

Note: Phase 11 (History Engine) doesn't exist yet, so these Commands are
standalone `ICommand` implementations, ready to be pushed onto History's
undo/redo stacks once it's built — same latitude Phase 4 had with no
Command Bus wired up yet.

---

## Phase 6 — Animation Engine (`packages/animation`)

### 6.1 Property system

- [ ] `AnimatablePropertyRegistry` — registers animatable properties per layer type (type, default, interpolator, validator)
- [ ] Plugin extension point for custom properties

### 6.2 Keyframes

- [ ] `Keyframe` (tick, value, easing: Bezier | Step | Linear)
- [ ] Per-property keyframe track
- [ ] Add / move / delete / modify keyframe (all via Commands)

### 6.3 Interpolation

- [ ] Linear, Bezier (cubic), Step (hold) interpolators
- [ ] Easing library (ease-in, ease-out, ease-in-out, custom Bezier)
- [ ] Multi-clip property blending (evaluation order — ADR-005 DAG primitive)

### 6.4 Evaluation

- [ ] `evaluateAt(layerId, propertyKey, tick) → value`
- [ ] Incremental evaluation (only re-compute changed properties per tick)

---

## Phase 7 — Rendering Engine (`packages/rendering`)

### 7.1 Backend abstraction

- [ ] `IRenderBackend` interface (`init / drawFrame / dispose`)
- [ ] WebGPU backend (primary — `05-rendering-engine/webgpu.md`)
- [ ] WebGL2 backend (fallback — **shaders are WGSL vs GLSL, author both**)
- [ ] Canvas2D backend (last resort)
- [ ] Backend detection + auto-selection at startup

### 7.2 Frame State → Scene Graph → pixels

- [ ] `buildSceneGraph(frameState) → SceneGraph` (ephemeral, destroyed after frame)
- [ ] Scene graph node: bounds, transform, opacity, effect chain ref, dirty flag
- [ ] Render Graph execution (effect chain per node, ADR-005 DAG primitive)
- [ ] Dirty-tracking: only re-render nodes whose inputs changed

### 7.3 GPU memory management

- [ ] Texture cache with LRU eviction (**add concrete memory budget number before implementing**)
- [ ] `OffscreenCanvas` for worker-based rendering

### 7.4 Frame cache

- [ ] Decoded frame cache for video (LRU)
- [ ] Pre-decode lookahead (N frames ahead of playhead)

---

## Phase 8 — Effects Engine (`packages/effects`)

- [ ] Effect node interface: `IEffectNode` (inputs, outputs, WGSL shader, GLSL shader)
- [ ] Blur (Gaussian)
- [ ] Glow
- [ ] Drop shadow
- [ ] Blend modes (multiply, screen, overlay, etc.)
- [ ] Color adjustments (brightness, contrast, saturation, hue)
- [ ] CSS filters as Canvas2D fallback for effects
- [ ] Transition effects (cross-dissolve, wipe, etc.)

---

## Phase 9 — Audio Engine (`packages/audio`)

### 9.1 Realtime preview

- [ ] `AudioContext`-based graph for live preview
- [ ] Per-track volume/mute/pan nodes
- [ ] Mixer: master + per-track faders
- [ ] Sync to Timeline tick (explicit resync strategy for long projects — open risk)

### 9.2 Export render

- [ ] `OfflineAudioContext` for offline render (different timing model — note in code)
- [ ] `AudioWorklet` nodes must work correctly under both `AudioContext` and `OfflineAudioContext`

---

## Phase 10 — Export Engine (`packages/export`)

Uses findings from **Spike A** — do not implement until Spike A is documented.

- [ ] Frame State evaluation loop (same pipeline as preview — Frame State is the contract)
- [ ] `VideoEncoder` wrapper (H.264 primary, VP9 secondary)
- [ ] `AudioEncoder` wrapper (Opus primary, AAC with Firefox/Linux caveat documented)
- [ ] MP4 muxer integration (`mp4-muxer` or validated equivalent)
- [ ] WebM muxer for VP9+Opus
- [ ] Export presets: 1080p30 H.264+Opus (MVP), 4K, 720p, GIF (post-MVP)
- [ ] Export progress events (Worker → Event Bus → UI progress bar)
- [ ] WASM fallback path (`ffmpeg.wasm`) for unsupported codecs/containers

---

## Phase 11 — History Engine (`packages/history`)

- [ ] `HistoryEngine` — two stacks: undo, redo
- [ ] `ICommand` interface: `execute() / undo() / redo() / description`
- [ ] Composite commands (multi-command transactions as one undo step)
- [ ] Max history depth (configurable, default 100)
- [ ] **Layout undo is a separate stack** (ADR-011) — panel/dock changes don't mix with project history
- [ ] History cleared on project load

---

## Phase 12 — Asset Manager (`packages/assets`)

- [ ] `AssetManager` — single source of truth for all assets
- [ ] Import pipeline (worker-based: decode, generate thumbnail + waveform, extract metadata, store in OPFS)
- [ ] Asset catalog (IndexedDB: id, name, type, size, duration, contentHash, tags, createdAt)
- [ ] Dedup by content hash (same file imported twice = one asset)
- [ ] Asset Dependency Graph (which TrackItems reference each asset — used for safe-delete warnings)
- [ ] "Unused assets" view = assets with zero incoming dependency references
- [ ] Supported types: MP4, MOV, WebM, MP3, WAV, OGG, PNG, JPEG, WebP, SVG, GIF, fonts, LUTs

---

## Phase 13 — AI Engine (`packages/ai`)

Uses findings from **Spike B** — do not implement full TTS pipeline until Spike B is documented.

- [ ] `CapabilityRegistry` — register/query AI capabilities (`TextToSpeech`, `BackgroundRemoval`, etc.)
- [ ] ONNX Runtime Web integration (WebGPU EP primary, WASM EP fallback)
- [ ] Model loading via OPFS cache (cold download → cache → warm load)
- [ ] TTS provider interface: `ITTSProvider` (`synthesize(text, voice) → AudioBuffer`)
- [ ] Kokoro-82M provider (implement based on Spike B findings)
- [ ] Piper provider (implement based on Spike B findings — independent, interchangeable, not a pipeline stage)
- [ ] Supertonic post-processing (optional voice enhancement stage, separate from TTS provider)
- [ ] Background removal (ONNX segmentation model — post-MVP)

---

## Phase 14 — Plugin System (`packages/plugin`)

- [ ] `IPlugin` interface (id, name, version, `activate(api) / deactivate()`)
- [ ] Plugin API surface: `EffectsAPI`, `ExportAPI`, `AICapabilityAPI`, `ToolAPI`, `PanelAPI`
- [ ] Plugin sandbox: plugins only see public APIs, never engine internals
- [ ] Plugin lifecycle: register → activate → suspend → deactivate
- [ ] Built-in plugins: (built-in effects, built-in export presets, built-in tools as first-class plugins)

---

## Phase 15 — Editor UI (`apps/studio`)

### 15.1 App shell (Next.js)

- [ ] PWA manifest + Service Worker (offline after first load)
- [ ] Dark theme design system (Tailwind, custom design tokens)
- [ ] Dockable panel layout (ResizablePanelGroup or custom)
- [ ] Keyboard shortcut system (`17-ui/shortcuts.md` — Command System)

### 15.2 Canvas panel

- [ ] `ViewportCamera` (pan/zoom/rotation — pure UI state, never saved to project)
- [ ] Layer selection (click, Shift+click, drag-box)
- [ ] Transform handles (move, scale, rotate)
- [ ] Overlays (bounding boxes, anchor points, safe zones)

### 15.3 Timeline panel

- [ ] Virtualized track/clip view (only render visible clips)
- [ ] Playhead scrubbing
- [ ] Track headers (label, mute, lock, solo)
- [ ] Clip rendering (thumbnail strip for video, waveform for audio, colored bar for others)
- [ ] Drag/drop clips (dnd-kit)
- [ ] Snapping indicators

### 15.4 Inspector panel

- [ ] `PropertySchemaRegistry` — maps layer types to UI sections + editors
- [ ] Numeric, text, color, dropdown, toggle editors
- [ ] Animated property indicator (diamond icon) + keyframe add/remove
- [ ] Inline validation (UX convenience — real enforcement is in command handlers)

### 15.5 Asset Browser panel

- [ ] Thin UI view over `AssetManager` (no registry of its own — ADR-002)
- [ ] Import button (opens File System Access API picker)
- [ ] Grid/list toggle, search, filter by type
- [ ] Unused assets filter (zero dependency references)
- [ ] Drag asset from panel to Timeline/Canvas

### 15.6 Toolbar

- [ ] Tool System (from `17-ui/toolbar.md` — ADR-001)
- [ ] Tools: Select, Pen/Shape, Text, Scissors (cut), Hand (pan)
- [ ] Tool sessions (stateful while active, cleaned up on switch)

### 15.7 State management (Zustand — UI-only state)

- [ ] `useTimelineStore` — playhead, zoom, scroll, selection
- [ ] `useCanvasStore` — ViewportCamera, active tool, overlay visibility
- [ ] `useInspectorStore` — selected layer, open sections
- [ ] `useProjectStore` — project metadata (name, saved state, dirty flag)
- [ ] Project data (Layers, TrackItems, Keyframes) is **not** in Zustand — it lives in engine state, read via selectors

---

## Phase 16 — Testing

### 16.1 Unit tests (Vitest, no browser required)

- [ ] All Commands (execute/undo/redo round-trip)
- [ ] Tick arithmetic utilities
- [ ] Frame State evaluation (Timeline + Animation → Frame State)
- [ ] Discount pricing analogue: Keyframe interpolation (exhaustive easing + bezier tests)
- [ ] VFS adapter (mock IndexedDB/OPFS)
- [ ] Asset dedup by content hash

### 16.2 Integration tests (Vitest + real OPFS in worker)

- [ ] Project save → load → verify round-trip
- [ ] Asset import → catalog → dedup
- [ ] Export pipeline (Spike A validated path only)

### 16.3 E2E tests (Playwright)

- [ ] Import clip → trim → move → undo → redo → export
- [ ] Text layer add → edit → style → export
- [ ] TTS generate → place on timeline → export with audio

---

## Phase 17 — PWA & DevOps

- [ ] Service Worker: cache app shell + static assets on install; serve from cache offline
- [ ] `OPFS` for user media (already offline by nature)
- [ ] Web App Manifest: name, icons, `display: standalone`, `orientation: landscape`
- [ ] GitHub Actions: lint → typecheck → unit test → build → e2e (Playwright, headless Chromium)
- [ ] Release: semantic versioning, auto-generated changelog from Conventional Commits
- [ ] Bundle size budget: main bundle < 500KB gzip; AI models loaded on demand via OPFS

---

## Milestones summary

| Milestone | Gate condition                                                                                                                                                                                                   |
| --------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **M0**    | ✅ Both spikes complete with written findings (2026-07-06)                                                                                                                                                       |
| **M1**    | Monorepo scaffold + shared types compiling                                                                                                                                                                       |
| **M2**    | ✅ Core Engine: DI, event bus, scheduler, workers running (2026-07-06)                                                                                                                                           |
| **M3**    | ✅ Storage: VFS, project save/load, asset OPFS store (2026-07-06)                                                                                                                                                |
| **M4**    | Vertical slice: import → trim → move → undo → export (preview == export). Layer Engine ✅ (2026-07-06) and Timeline Engine ✅ (2026-07-06) prerequisites done; Rendering/Export/History/Canvas UI still pending. |
| **M5**    | ✅ All layer types, full Timeline edit ops (2026-07-06) — Animation Engine still pending                                                                                                                         |
| **M6**    | Rendering: WebGPU + WebGL2 fallback, Effects Engine                                                                                                                                                              |
| **M7**    | Audio Engine preview + export, full Export presets                                                                                                                                                               |
| **M8**    | Asset Manager complete (dedup, dependency graph, thumbnails/waveforms)                                                                                                                                           |
| **M9**    | AI Engine: TTS in timeline, export with voice                                                                                                                                                                    |
| **M10**   | Plugin System live, built-in tools as plugins                                                                                                                                                                    |
| **M11**   | Full Editor UI (Canvas, Timeline, Inspector, Asset Browser, Toolbar)                                                                                                                                             |
| **M12**   | PWA (offline, installable), CI/CD, release pipeline                                                                                                                                                              |

---

## Deferred to v2 / v3

- `SceneCamera` track type (keyframeable in-scene camera moves)
- Background removal AI
- Expressions / constraints in Animation Engine
- Collaborative editing
- Cloud sync
- Mobile support (WebGPU on mobile is behind flags — wait for broad availability)
- bKash / Nagad / card payments (n/a — that's the 2A project)
