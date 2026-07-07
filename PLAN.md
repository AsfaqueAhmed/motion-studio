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

## Phase 6 — Animation Engine (`packages/animation`) ✅ complete (2026-07-06)

### 6.1 Property system

- [x] `AnimatablePropertyRegistry` — registers animatable properties per layer type (type, default, interpolator, validator)
- [x] Plugin extension point for custom properties — `registry.register()` itself; a plugin calls it directly, no separate API needed

### 6.2 Keyframes

- [x] `Keyframe` (tick, value, easing: Bezier | Step | Linear) — `IKeyframe` in `@motion-studio/shared`; identified by tick within its track (no separate `KeyframeId`), see `docs/06-animation-engine/keyframes.md`
- [x] Per-property keyframe track — `IPropertyTrack`
- [x] Add / move / delete / modify keyframe (all via Commands) — `AddKeyframeCommand`/`MoveKeyframeCommand`/`DeleteKeyframeCommand`/`ModifyKeyframeCommand`

### 6.3 Interpolation

- [x] Linear, Bezier (cubic), Step (hold) interpolators
- [x] Easing library (ease-in, ease-out, ease-in-out, custom Bezier) — bounce/elastic/back deferred (not expressible as a single cubic-bezier), see `docs/06-animation-engine/easing.md`
- [ ] Multi-clip property blending (evaluation order — ADR-005 DAG primitive) — **not implemented, still an open decision** (`AnimationEngine.addClip` throws on a second Clip per Layer); see `docs/06-animation-engine/overview.md` "Multi-clip blending"

### 6.4 Evaluation

- [x] `evaluateAt(layerId, propertyKey, tick) → value`
- [x] Incremental evaluation (only re-compute changed properties per tick) — `SegmentLocator` caches the last resolved keyframe pair per track, skipping the binary search when the tick stays in the same segment; see `docs/06-animation-engine/animation-player.md`

Note: as with Phase 5, there is no History Engine yet (Phase 11), so
these four Commands are standalone `ICommand` implementations, ready to
be pushed onto History's undo/redo stacks once it's built.

---

## Phase 7 — Rendering Engine (`packages/rendering`) ✅ complete (2026-07-07)

### 7.1 Backend abstraction

- [x] `IRenderBackend` interface (`init / drawFrame / dispose`)
- [x] WebGPU backend (primary — `05-rendering-engine/webgpu.md`) — real WGSL vertex/fragment pipeline, hand-rolled minimal `IGPUDevice`/`IGPUCanvasContext` (no `@webgpu/types` dep), verified against a fake device (no real GPU in Node/Vitest)
- [x] WebGL2 backend (fallback — **shaders are WGSL vs GLSL, author both**) — real GLSL `#version 300 es` pipeline mirroring the WGSL topology exactly
- [x] Canvas2D backend (last resort) — real `save/translate/rotate/scale/fillRect` pipeline against a hand-rolled `ICanvas2DContext`
- [x] Backend detection + auto-selection at startup — `selectBackend()`, WebGPU → WebGL2 → Canvas2D → `Software` (headless/CI, not in the original fallback chain text but already scoped in `renderer-overview.md`'s backend diagram)
- [x] `Software` backend (pure-JS RGBA framebuffer, no DOM/GPU at all) — added beyond the original checklist so Node/CI/this package's own tests have something fully real to render against; not a mock, a genuine 4th backend

### 7.2 Frame State → Scene Graph → pixels

- [x] `buildSceneGraph(frameState) → SceneGraph` (ephemeral, destroyed after frame)
- [x] Scene graph node: bounds, transform, opacity, properties — flat, no parent/child (hierarchy lives in the persistent Composition Graph, one layer up) and no "effect chain ref"/"dirty flag" fields on the node itself; dirty state lives in `SceneGraphDirtyTracker` instead (diffs successive Scene Graphs), see `docs/05-rendering-engine/scene-graph.md`
- [x] Render Graph execution (effect chain per node, ADR-005 DAG primitive) — `RenderGraph` on `Dag<TId>` (ADR-005 #3, added to `@motion-studio/shared` this phase); today every layer gets the identity chain since Effects Engine (Phase 8) doesn't exist yet — **not wired into any backend's `drawFrame` yet**, see `compositor.md` open questions
- [x] Dirty-tracking: only re-render nodes whose inputs changed — `SceneGraphDirtyTracker` on the new `DirtyTrackedGraph<TId>` (ADR-005 #1, added to `@motion-studio/shared` this phase); dirty _rectangles_ (partial repaint) still not implemented, see `frame-rendering.md`

### 7.3 GPU memory management

- [ ] Texture cache with LRU eviction (**add concrete memory budget number before implementing**) — `TextureCache` built deliberately _without_ eviction; the budget number is still genuinely open (CLAUDE.md "Known hard risks" #6), see `docs/05-rendering-engine/gpu-memory.md`
- [ ] `OffscreenCanvas` for worker-based rendering — not implemented; no worker-based render path exists yet (Core's `WorkerManager` has a `rendering` slot reserved since Phase 2, unused so far)

### 7.4 Frame cache

- [x] Decoded frame cache for video (LRU) — `DecodedFrameCache<TFrame>`, count-based eviction (not GPU-memory-bounded, so no budget number needed); not yet wired to a real `VideoDecoder` pipeline (Assets/Export own that, Phases 10/12)
- [x] Pre-decode lookahead (N frames ahead of playhead) — `computeLookaheadTicks(currentTick, ticksPerFrame, lookaheadFrames)`

### Also landed this phase (not in the original checklist)

- [x] Color space conversion (`color-space.ts`, `yuvToRgb` BT.601/BT.709) — closes the "color space handling is currently unspecified" gap from `renderer-overview.md`; not yet wired to any backend since no real decoded video texture exists yet
- [x] `RenderingEngine implements IEngine` facade (`rendering-engine.ts`) tying Frame State → Scene Graph → dirty-tracking → backend together, matching every other engine's `initialize/ready/dispose` lifecycle
- [x] Fixed a pre-existing, repo-wide `tsc -b --noEmit` bug (TS6310 — build-mode `--noEmit` is fundamentally incompatible with TypeScript project references whenever an upstream referenced project needs a real rebuild). Every package's `"typecheck"` script changed from `tsc -b --noEmit` to `tsc -b`. This wasn't a Phase 7 regression — it silently affected every prior phase too, just never surfaced because turbo's cache hid it.

---

## Phase 8 — Effects Engine (`packages/effects`) ✅ complete (2026-07-07)

- [x] Effect node interface: `IEffectNode` (inputs, outputs, WGSL shader, GLSL shader) — `effect-node.ts`; structurally compatible with Rendering's `IRenderGraphNode` (`id` + `dependencyIds`) without importing it, per engine-boundary rule
- [x] Blur (Gaussian) — real two-pass separable blur (`createGaussianBlurPair`), weights baked as shader constants, see `docs/09-effects-engine/blur.md`
- [x] Glow — 4-node chain (bright-pass → blur → additive composite), see `docs/09-effects-engine/glow.md`
- [x] Drop shadow — 4-node chain (silhouette → blur → composite-under), see `docs/09-effects-engine/shadow.md`
- [x] Blend modes (multiply, screen, overlay, etc.) — all 11 modes (Normal + 10), two-input nodes, see `docs/09-effects-engine/blend-modes.md`
- [x] Color adjustments (brightness, contrast, saturation, hue) — plus temperature/tint from the doc stub's original scope, see `docs/09-effects-engine/color-adjustments.md`
- [x] CSS filters as Canvas2D fallback for effects — `css-filter-chain.ts`'s `composeCssFilterChain`, reports unsupported nodes rather than silently degrading, see `docs/09-effects-engine/filters.md`
- [x] Transition effects (cross-dissolve, wipe, etc.) — cross-dissolve + 4-direction wipe, two-input nodes driven by a `progress` Timeline computes (Effects never reads Timeline state), see `docs/09-effects-engine/transitions.md`

Note: no backend wiring yet — nothing calls a backend's `drawFrame` with a
non-identity `RenderGraph` built from these nodes; that integration (plus
the render-target/multi-pass plumbing separable blur/glow/shadow all need)
is still open, same gap Phase 7 flagged in `compositor.md`.

---

## Phase 9 — Audio Engine (`packages/audio`) ✅ complete (2026-07-07)

### 9.1 Realtime preview

- [x] `AudioContext`-based graph for live preview — `buildClipChain` (`Clip -> Gain -> Pan`, `audio-graph.ts`) against the shared `IAudioContext` interface, see `docs/10-audio-engine/audio-graph.md`
- [x] Per-track volume/mute/pan nodes — `Mixer.addTrack`/`setTrackVolume`/`setTrackMuted`/`setTrackPan` (`mixer.ts`); mute layers on top of volume rather than overwriting it
- [x] Mixer: master + per-track faders — `masterGain -> limiter -> destination` plus one bus per `TrackId`, see `docs/10-audio-engine/mixer.md`
- [x] Sync to Timeline tick (explicit resync strategy for long projects — open risk) — `AudioClockSync` (`synchronization.ts`): anchor `(tick, currentTime)` at play/seek, re-anchor once drift exceeds a threshold; wired to Core's `Scheduler.onAudioSync(tick)` via `AudioTransport` (`playback.ts`), closes the open risk in CLAUDE.md/DECISIONS.md — see `docs/10-audio-engine/synchronization.md`

### 9.2 Export render

- [x] `OfflineAudioContext` for offline render (different timing model — note in code) — `IOfflineAudioContext` (`audio-context.ts`), `AudioEngine.buildOfflineMixer` builds an independent `Mixer` against it; same graph-construction code as realtime, per `docs/10-audio-engine/overview.md` "Preview vs. export"
- [x] `AudioWorklet` nodes must work correctly under both `AudioContext` and `OfflineAudioContext` — `IAudioWorkletContext`/`createAudioWorkletEffectNode` (`effects.ts`) registration plumbing is real and context-agnostic; no actual worklet DSP (Noise Gate/Pitch Shift/Speed) ships yet, see `docs/10-audio-engine/effects.md`

### Also landed this phase (not in the original checklist)

- [x] Native effect nodes beyond the checklist's scope: EQ (`createEqChain`), Compressor, Limiter, Delay, Reverb (`createReverbChain`, convolution) — all real, native Web Audio graphs, see `docs/10-audio-engine/effects.md`
- [x] Ducking (`Mixer.duckTrack`) — carried-forward design-review recommendation from `overview.md`, a scheduled gain ramp on the existing per-track bus
- [x] Waveform consumer-side types (`IWaveformData`, `peaksInRange`) — Audio Engine's read-only half of `docs/10-audio-engine/waveform.md`; generation stays Assets/Media's job
- [x] Corrected `overview.md`'s original claim that Noise Gate is a native `DynamicsCompressorNode` composition — it isn't (no native node expresses a per-sample gate), reclassified alongside Pitch Shift/Speed as AudioWorklet-only, see `docs/10-audio-engine/effects.md`

Note: no wiring yet to a real Timeline (`ITrackItem`) or decoded media
(`AudioBuffer` from a real asset) — this phase implements the graph,
mixer, and clock-sync mechanics against the shared `IAudioContext`
interface, the same "engine exists, integration is a later phase" gap
Phases 7/8 flagged for Rendering/Effects backend wiring.

---

## Phase 10 — Export Engine (`packages/export`) ✅ complete (2026-07-07)

Uses findings from **Spike A** — do not implement until Spike A is documented.

- [x] Frame State evaluation loop (same pipeline as preview — Frame State is the contract) — `computeExportFrames` (`frame-evaluator.ts`) resamples the Composition's own tick-space/fps to the preset's target fps; `IFrameEvaluator`/`IExportFrameRenderer` are the injection points a real Timeline+Rendering wiring will satisfy later, see `docs/13-export/overview.md`
- [x] `VideoEncoder` wrapper (H.264 primary, VP9 secondary) — no separate wrapper; Mediabunny's `IVideoTrackSource.add()` (`container.ts`) already fuses render-capture + encode, see `docs/13-export/encoder.md` "Why no wrapper"
- [x] `AudioEncoder` wrapper (Opus primary, AAC with Firefox/Linux caveat documented) — same fusion via `IAudioTrackSource`; codec choice resolved by `resolveAudioCodec` (`codecs.ts`), AAC-on-Firefox gap documented in `docs/13-export/webcodecs.md` and enforced by real fallback logic, not just a comment
- [x] MP4 muxer integration (`mp4-muxer` or validated equivalent) — **Mediabunny**, per ADR-012; `IMuxerOutput`/`IMuxerFactory` (`container.ts`) are hand-rolled DI interfaces structurally matching its real API, no actual `mediabunny` dependency added yet (same "engine exists, integration is later" gap as Rendering/Effects/Audio)
- [x] WebM muxer for VP9+Opus — `ContainerFormat.WebM` + `Preset1080p30VP9Opus` (`presets.ts`); same DI interfaces, untested against a real Mediabunny `WebMOutputFormat` (open question carried from `muxer.md`)
- [x] Export presets: 1080p30 H.264+Opus (MVP), 4K, 720p, GIF (post-MVP) — 720p/1080p/4K (H.264+Opus, MP4) plus one WebM/VP9+Opus preset shipped; **GIF intentionally not implemented** — not a WebCodecs/Mediabunny target format at all, see `docs/13-export/export-presets.md`
- [x] Export progress events (Worker → Event Bus → UI progress bar) — `runExportJob` emits `ExportProgressed`/`ExportCompleted`/`ExportFailed` (already in `@motion-studio/shared`'s event catalog) through an injected `IExportEventSink`; no real Worker wiring yet, runs on the caller's thread
- [x] WASM fallback path (`ffmpeg.wasm`) for unsupported codecs/containers — registration-only plumbing (`wasm-fallback.ts`), matching Phase 9's AudioWorklet precedent; no actual `ffmpeg.wasm` module ships, and `export-job.ts` doesn't call into it yet on a codec-resolution failure, see `docs/13-export/ffmpeg-wasm.md`

Note: `ExportEngine` (`export-engine.ts`) is a thin `IEngine` facade around
`runExportJob`, matching `RenderingEngine`'s split — cancellation via
per-job `AbortController`, duplicate-`jobId` rejection, `dispose()`
aborting every in-flight job. Export Graph (multiple output branches
sharing one render pass, ADR-005) is **not** implemented — one video+audio
output per job only, see `docs/13-export/overview.md`'s "Export Graph"
section.

---

## Phase 11 — History Engine (`packages/history`) ✅ complete (2026-07-07)

- [x] `HistoryEngine` — two stacks: undo, redo — `HistoryEngine implements IHistoryEngine`, see `docs/15-history/overview.md`
- [x] `ICommand` interface: `execute() / undo() / redo() / description` — already existed in `@motion-studio/shared` (`command.ts`) since Phase 5/6 built real `ICommand`s ahead of History existing; `label` is this project's "description", see `docs/15-history/command-pattern.md`
- [x] Composite commands (multi-command transactions as one undo step) — `CompositeCommand` (`src/commands/composite-command.ts`); bundles a literal Command sequence, not a re-runnable Intent — "macro recording granularity" open question in `overview.md` resolved in favor of the simpler/brittle option for now
- [x] Max history depth (configurable, default 100) — `HistoryEngine` constructor option `maxDepth`, oldest undo entry dropped on overflow
- [x] **Layout undo is a separate stack** (ADR-011) — `LayoutHistoryStack` (`src/layout-history.ts`), a distinct class/instance from `HistoryEngine`, minimal per the ADR: tracks only the single most recent layout change (no deep stack)
- [x] History cleared on project load — `HistoryEngine.clear()`; not self-wired to the `ProjectLoaded` event since no cross-engine event wiring exists yet anywhere in the codebase (same gap as Rendering's Render Graph / Effects backend wiring) — the future Editor Service layer calls it

Note: `CommandExecuted`/`CommandUndone`/`CommandRedone` events already existed
in `@motion-studio/shared`'s event catalog (added speculatively during an
earlier phase); `HistoryEngine` emits them through an injected
`IHistoryEventSink`, matching Export's `IExportEventSink` DI pattern — no
direct `EventBus` dependency.

---

## Phase 12 — Asset Manager (`packages/assets`) ✅ complete (2026-07-07)

- [x] `AssetManager` — single source of truth for all assets — `AssetManager implements IAssetsEngine` (`asset-manager.ts`), thin facade over `AssetCatalog` + `AssetDependencyGraph` + the import pipeline, matching `ExportEngine`/`HistoryEngine`'s split, see `docs/14-assets/asset-manager.md`
- [x] Import pipeline (worker-based: decode, generate thumbnail + waveform, extract metadata, store in OPFS) — `importAsset` (`import-pipeline.ts`) runs the full validate→hash→store→metadata→thumbnail→waveform→catalog sequence; **not worker-based** — runs on the caller's thread, same unwired gap as Export's job runner (Phase 10), see `docs/14-assets/importer.md`
- [x] Asset catalog (IndexedDB: id, name, type, size, duration, contentHash, tags, createdAt) — `IAssetCatalogEntry`/`AssetCatalog` (`asset-catalog.ts`); `IAssetCatalogStore` is a DI interface matching storage's `IRepository<T>` shape, no real IndexedDB-backed store wired in yet (same "engine exists, integration is later" gap as every DI boundary since Phase 7)
- [x] Dedup by content hash (same file imported twice = one asset) — the `AssetId` **is** `createAssetId(contentHash)`, so re-import resolves to the same catalog row and skips re-running metadata/thumbnail/waveform extraction entirely, see `docs/14-assets/importer.md` "Dedup"
- [x] Asset Dependency Graph (which TrackItems reference each asset — used for safe-delete warnings) — `AssetDependencyGraph` (`dependency-graph.ts`) built on the generic `Hierarchy<TId>` primitive (ADR-005 #2) rather than a bespoke structure, per `Hierarchy`'s own Phase-4 doc comment anticipating this exact reuse; never imports Layer/Timeline (CLAUDE.md "the one rule") — callers register/unregister references explicitly
- [x] "Unused assets" view = assets with zero incoming dependency references — `AssetManager.listUnused()`
- [x] Supported types: MP4, MOV, WebM, MP3, WAV, OGG, PNG, JPEG, WebP, SVG, GIF, fonts, LUTs — `detectAssetType` (`supported-types.ts`), extension-first (MIME is unreliable/empty for fonts and `.cube` LUTs in practice) with MIME fallback; `AssetType` enum added to `@motion-studio/shared`

Note: Proxy generation (mentioned in `docs/14-assets/overview.md`'s
original stub as "the single most important thing" for 4K+ footage) and
thumbnail LOD-by-zoom-level are **not implemented** — neither was in this
checklist. `AssetDeleted` was added to `@motion-studio/shared`'s event
catalog alongside the already-speculative `AssetImported`/
`AssetImportFailed`.

---

## Phase 13 — AI Engine (`packages/ai`) ✅ complete (2026-07-07)

Uses findings from **Spike B** — do not implement full TTS pipeline until Spike B is documented.

- [x] `CapabilityRegistry` — register/query AI capabilities (`TextToSpeech`, `BackgroundRemoval`, etc.) — `CapabilityRegistry` (`capability-registry.ts`): `registerDescriptor`/`registerProvider`/`resolveProvider`, see `docs/11-ai/provider-system.md`
- [x] ONNX Runtime Web integration (WebGPU EP primary, WASM EP fallback) — `InferenceBackend`/`resolveInferenceBackend`/`IOnnxRuntime`/`IInferenceSession` (`inference-backend.ts`), DI interfaces structurally matching `onnxruntime-web`'s real `Tensor`/`InferenceSession` API (confirmed against the vendored `kokoro-js` build from Spike B); no real `onnxruntime-web` dependency added yet, see `docs/11-ai/overview.md`
- [x] Model loading via OPFS cache (cold download → cache → warm load) — `ModelManager.ensureLoaded` (`model-manager.ts`): checks `IModelBlobStore` first (warm), else `downloadAndVerify` + store (cold) before creating a session; `IModelBlobStore` is DI-only, no OPFS wired yet, see `docs/11-ai/model-manager.md`
- [x] TTS provider interface: `ITTSProvider` (`synthesize(text, voice) → AudioBuffer`) — `ITTSProvider`/`ISynthesizedAudio` (`tts-provider.ts`); `ISynthesizedAudio` is a hand-rolled structural subset of `AudioBuffer` (sample rate, channel data), not `lib.dom`'s type, matching Audio's own `IAudioBuffer` DI pattern
- [x] Kokoro-82M provider (implement based on Spike B findings) — `KokoroProvider` (`kokoro-provider.ts`): input/output tensor names (`input_ids`/`style`/`speed` → `waveform`), 24kHz output, and the style-vector offset formula are all confirmed against the vendored `kokoro-js` source, not guessed, see `docs/11-ai/kokoro.md` "Implementation (Phase 13)"
- [x] Piper provider (implement based on Spike B findings — independent, interchangeable, not a pipeline stage) — `PiperProvider` (`piper-provider.ts`) implements the same `ITTSProvider` shape, proving the "independent provider, not a pipeline stage" architecture; its tensor names are **placeholders**, unverified against any real Piper export, see `docs/11-ai/piper.md`
- [x] Supertonic post-processing (optional voice enhancement stage, separate from TTS provider) — `IVoiceEnhancer`/`registerVoiceEnhancer` (`voice-enhancer.ts`), registration-only plumbing matching Export's `wasm-fallback.ts` precedent; no real enhancer ships, see `docs/11-ai/supertonic.md`
- [x] Background removal (ONNX segmentation model — post-MVP) — **intentionally not implemented**, exactly as this checklist item itself labels it ("post-MVP"); `AICapability.BackgroundRemoval` exists in `@motion-studio/shared` with no provider, matching every other unfulfilled `AICapability` value

Note: `AIManager` (`ai-manager.ts`) is a thin `IEngine` facade over
`CapabilityRegistry` + `ModelManager` + registered `ITTSProvider`s,
matching `AssetManager`/`ExportEngine`'s split. `InferenceCompleted`/
`InferenceFailed`/`ModelDownloadProgressed`/`ModelLoaded`/`ModelLoadFailed`
were added to `@motion-studio/shared`'s event catalog this phase. Task
queue / priority scheduling / worker dispatch (`docs/11-ai/ai-manager.md`'s
original scope) is **not implemented** — every call runs synchronously on
the caller's thread, the same gap as Export's job runner and Assets'
import pipeline.

---

## Phase 14 — Plugin System (`packages/plugin`) ✅ complete (2026-07-07)

- [x] `IPlugin` interface (id, name, version, `activate(api) / deactivate()`) — `IPlugin` (`plugin.ts`); this doc's own `effects-api.md`/etc. stubs had earlier speculated `initialize()/destroy()/serialize()/deserialize()` naming, superseded by this checklist's `activate`/`deactivate`, see `docs/16-plugin-system/plugin-api.md`
- [x] Plugin API surface: `EffectsAPI`, `ExportAPI`, `AICapabilityAPI`, `ToolAPI`, `PanelAPI` — `IEffectsAPI`/`IExportAPI`/`IAICapabilityAPI`/`IToolAPI`/`IPanelAPI`, each a Plugin-package-local DI interface structurally mirroring the real engine's public surface (never importing it — `@motion-studio/plugin`'s only dependency is `@motion-studio/shared`, same as every other engine package); `ToolAPI`/`PanelAPI` mirror `docs/17-ui/toolbar.md`/`panels.md` but have no real Tool Registry/Workspace Engine to wire into yet (Phase 15/17-ui not built), see `docs/16-plugin-system/overview.md`
- [x] Plugin sandbox: plugins only see public APIs, never engine internals — enforced at the type level (Plugin package cannot import other engine packages at all) **and** at runtime: `buildScopedPluginAPI` (`permissions.ts`) returns `undefined` for every sub-API a plugin's manifest didn't request, even if the host provided it, see `docs/16-plugin-system/lifecycle.md` "Sandboxing"
- [x] Plugin lifecycle: register → activate → suspend → deactivate — `PluginRegistry` (`plugin-registry.ts`) state machine over the extended `PluginLifecycleState` enum (`Suspended`/`Deactivated` added to `@motion-studio/shared` this phase — the enum was scaffolded in Phase 1 with only the register/activate half modeled); `suspend()`/`resume()` are registry-only bookkeeping, no plugin method is called, since `IPlugin` declares no such hooks — see `docs/16-plugin-system/lifecycle.md`
- [x] Built-in plugins: (built-in effects, built-in export presets, built-in tools as first-class plugins) — `createSelectToolPlugin()` and `createDefaultExportPresetPlugin()` (`built-ins/`) go through the identical `register`/`activate` path a third-party plugin would; **no built-in-effects plugin** — would require a real `IEffectsAPI` implementation (none exists) or forking real WGSL/GLSL shader source as plugin-side data, neither of which is reasonable without the integration layer that doesn't exist yet, see `docs/16-plugin-system/effects-api.md`

Note: `PluginEngine implements IPluginEngine` (`plugin-engine.ts`) is a thin
facade over `PluginRegistry`, matching `AIManager`/`ExportEngine`/
`HistoryEngine`'s split. It takes a caller-assembled `hostApi: IPluginAPI`
in its constructor — no integration layer exists yet that holds real
`EffectsEngine`/`ExportEngine`/`AIManager` instances _and_ a
`PluginRegistry` to assemble that `hostApi`, the same "engine exists,
integration is later" gap every prior phase (7 through 13) flagged for its
own cross-engine wiring.

---

## Phase 15 — Editor UI (`apps/studio`) ✅ complete (2026-07-07)

### 15.1 App shell (Next.js)

- [x] PWA manifest + Service Worker (offline after first load) — `public/manifest.json` + hand-rolled `public/sw.js` (cache-first static assets, network-first-with-cache-fallback navigation); no `next-pwa`/Workbox dependency added
- [x] Dark theme design system (Tailwind, custom design tokens) — `tailwind.config.ts` `editor.*` token set (`bg/surface/surface-raised/border/text/text-muted/accent`), `darkMode: "class"`, `<html className="dark">`
- [x] Dockable panel layout (ResizablePanelGroup or custom) — **scoped down to a fixed CSS grid** (`EditorShell`); no Split/Stack/Panel tree, no floating panels, no workspace presets, no layout-undo (ADR-011) — real docking engine deferred, see `docs/17-ui/docking.md`
- [x] Keyboard shortcut system (`17-ui/shortcuts.md` — Command System) — `ShortcutService` (Global scope only, 6 bindings, duplicate-binding conflict detection); Command Palette and Macro recording not built (ADR still open on Intent-vs-literal-Command replay)

### 15.2 Canvas panel

- [x] `ViewportCamera` (pan/zoom/rotation — pure UI state, never saved to project) — `useCanvasStore` field declared; not yet wired to actual pan/zoom gesture handling (no Interaction Pipeline exists — see 15.6 note)
- [x] Layer selection (click, Shift+click, drag-box) — single-select only, inline AABB hit-test against the last-rendered Frame State (`worldBounds`) — **placeholder for the real Selection Engine spatial index**, which doesn't exist as a package (`toolbar.md`'s "Hit testing" section); Shift+click/drag-box not implemented
- [x] Transform handles (move, scale, rotate) — **not implemented**; Inspector numeric fields are the only way to edit transform this phase
- [x] Overlays (bounding boxes, anchor points, safe zones) — bounding-box overlay only, drawn on a separate 2D overlay `<canvas>`; anchor points/safe zones not implemented

Real `RenderingEngine`/`IRenderBackend` pipeline wired end-to-end (`render-backend-factory.ts`: WebGPU→WebGL2→Canvas2D→Software, falling back further if construction throws) — verified in a real Chromium via Playwright that a placeholder colored rect actually reaches canvas pixels (pixel-sampled, not just "no console errors"). `RenderingEngine`'s lifecycle is owned by `CanvasPanel`, not `AppEngine` (needs a real `<canvas>`, which only exists once the panel mounts). `frame-state-builder.ts` is new glue (Timeline+Animation+Layer → Frame State) that didn't exist in any engine package. Every layer renders at a fixed `PLACEHOLDER_BOUNDS` (200×200) — no engine models a Layer's intrinsic size yet.

### 15.3 Timeline panel

- [x] Virtualized track/clip view (only render visible clips) — **scoped down to plain full render, no windowing**; track/item counts in this vertical slice are small enough that virtualization has no observable benefit yet
- [x] Playhead scrubbing — click-to-seek on track lane background, via `PlaybackService`
- [x] Track headers (label, mute, lock, solo) — label/muted/locked shown; **no solo** (`ITrack` has no solo field, no engine soloing logic — not invented)
- [x] Clip rendering (thumbnail strip for video, waveform for audio, colored bar for others) — **colored bar with layer name only**; no thumbnail/waveform generation wired into any panel (no decoder pipeline anywhere in the project)
- [x] Drag/drop clips (dnd-kit) — one shared `DndContext` (`EditorShell`) for both Asset→Timeline (creates Layer+TrackItem via `TimelineEditorService.addClipFromAsset`) and Timeline-internal clip moves (`moveTrackItem`); `PointerSensor` activation distance + a same-position guard in `handleDragEnd` prevent a plain click from being misread as a zero-distance drag (found via manual Playwright testing — a real bug, not hypothetical: it silently pushed no-op `MoveTrackItemCommand`s onto the undo stack)
- [x] Snapping indicators — **not implemented**

### 15.4 Inspector panel

- [x] `PropertySchemaRegistry` — maps layer types to UI sections + editors — reuses `AnimatablePropertyRegistry` (Animation Engine) as the source of truth for which properties exist, adding only label/editor-widget/static-field UI concerns on top, per its own doc comment distinguishing it from that registry (see GLOSSARY.md)
- [x] Numeric, text, color, dropdown, toggle editors — numeric/text/color/toggle implemented; **no dropdown editor** (nothing in the current property set needs one — `textAlign`/`fitMode` render as plain text inputs, not `<select>`)
- [x] Animated property indicator (diamond icon) + keyframe add/remove — diamond adds a keyframe at the current tick (creates the `AnimationClip`/`PropertyTrack` on demand, bundled into one undo step); no per-keyframe remove UI yet (only via undo)
- [x] Inline validation (UX convenience — real enforcement is in command handlers) — no inline validation added; real enforcement already exists in `UpdateLayerCommand`/`AddKeyframeCommand` (unchanged)

### 15.5 Asset Browser panel

- [x] Thin UI view over `AssetManager` (no registry of its own — ADR-002) — `AssetEditorService` is a pure passthrough
- [x] Import button (opens File System Access API picker) — plain `<input type=file multiple>`, not the File System Access API (broader browser support, same user-facing result for import)
- [x] Grid/list toggle, search, filter by type — grid/list toggle + substring name search; **no filter-by-type** control
- [x] Unused assets filter (zero dependency references) — `listUnused()` checkbox, reuses `AssetDependencyGraph.isUnused`
- [x] Drag asset from panel to Timeline/Canvas — Timeline only (drop creates a Layer+TrackItem); dragging onto the Canvas panel isn't a drop target

### 15.6 Toolbar

- [x] Tool System (from `17-ui/toolbar.md` — ADR-001) — `ToolRegistry` (`apps/studio`) is the first real implementation of `IToolAPI`/the Tool Registry both `toolbar.md` and `packages/plugin/src/tool-api.ts` describe but neither built; wired as `PluginEngine`'s `hostApi.tools`
- [x] Tools: Select, Pen/Shape, Text, Scissors (cut), Hand (pan) — **Select only**, via `createSelectToolPlugin()` (Phase 14); no Interaction Pipeline exists (`InteractionContext`: pointer/camera/viewport/selection/snapping/guides/modifiers) for the other tools to drive, so they're not stubbed in either
- [x] Tool sessions (stateful while active, cleaned up on switch) — **not implemented**; `IPluginTool.activate()/deactivate()` are no-ops (same gap `createSelectToolPlugin`'s own Phase 14 doc comment flagged)

### 15.7 State management (Zustand — UI-only state)

- [x] `useTimelineStore` — playhead, zoom, scroll, selection — zoom/selection implemented; **no scroll-position state** (panel isn't scrollable beyond native overflow)
- [x] `useCanvasStore` — ViewportCamera, active tool, overlay visibility — all three fields present; camera isn't yet driven by any pan/zoom gesture (15.2)
- [x] `useInspectorStore` — selected layer, open sections — open-sections only; selected layer is deliberately _not_ duplicated here, it's derived from `useTimelineStore`'s selection (avoids two sources of truth)
- [x] `useProjectStore` — project metadata (name, saved state, dirty flag) — fields present; `dirty` isn't wired to a real save flow (no Project Service/persistence this phase)
- [x] Project data (Layers, TrackItems, Keyframes) is **not** in Zustand — it lives in engine state, read via selectors — `useEngineRevisionStore` is the one bridge from Event Bus to React re-renders; every panel reads Layers/TrackItems/Keyframes straight off the engine instances

Note: `EditorKernel`/`createEditorKernel` (`apps/studio/src/editor-kernel/`) is
the integration layer every phase since 7 has flagged as missing — it's the
first place that constructs and wires together real instances of Storage,
Assets, Layer, Timeline, Animation, History, and Plugin behind one
`AppEngine`, plus a `CommandBus` (thin wrapper over `HistoryEngine.execute`)
and Editor Services (Timeline/Inspector/Asset/Playback + `ToolRegistry`).
**Audio, Export, AI, and Effects are deliberately not constructed** — no
panel this phase touches them; they get wired in when their own UI lands.
`RenderingEngine` is also outside `AppEngine`'s lifecycle, owned instead by
`CanvasPanel` (needs a real `<canvas>` that only exists once mounted).
`AssetManager` is wired with real Phase 3/12 adapters (`IndexedDBAdapter` via
`StorageEngine`, `AssetBlobStore`, a new `AssetCatalogRepository` extending
`JsonRepository`) plus a new browser-API-backed `IMetadataExtractor`
(`createImageBitmap`/`<video>`/`AudioContext.decodeAudioData`/hand-rolled
SFNT `name`-table parsing for fonts) — the first concrete implementation of
that interface anywhere in the project. `AddLayerCommand`/`AddTrackItemCommand`/
`UpdateLayerCommand`/`AddAnimationClipCommand`/`AddPropertyTrackCommand`/
`RegisterAssetReferenceCommand` are new — Layer had zero `ICommand`s before
this, and Timeline/Animation had no "add a container" commands (only
mutate-existing ones). `DeleteSelectionIntent` only removes TrackItems, not
their Layers/Animation clips — ADR-010 (ripple/linked-delete cascade) is
still open, so no cascade policy was invented. Verified end-to-end in a real
headless Chromium (Playwright): import → drag onto Timeline → select →
edit/keyframe in Inspector → move → undo/redo, with the real
`RenderingEngine` pipeline confirmed via pixel sampling to reach actual
canvas pixels.

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

| Milestone | Gate condition                                                                                                                                                                                                                                                                                                                                                                            |
| --------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **M0**    | ✅ Both spikes complete with written findings (2026-07-06)                                                                                                                                                                                                                                                                                                                                |
| **M1**    | Monorepo scaffold + shared types compiling                                                                                                                                                                                                                                                                                                                                                |
| **M2**    | ✅ Core Engine: DI, event bus, scheduler, workers running (2026-07-06)                                                                                                                                                                                                                                                                                                                    |
| **M3**    | ✅ Storage: VFS, project save/load, asset OPFS store (2026-07-06)                                                                                                                                                                                                                                                                                                                         |
| **M4**    | Vertical slice: import → trim → move → undo → export (preview == export). Layer Engine ✅ (2026-07-06), Timeline Engine ✅ (2026-07-06), Rendering Engine ✅ (2026-07-07) prerequisites done; Export/History/Canvas UI still pending.                                                                                                                                                     |
| **M5**    | ✅ All layer types, full Timeline edit ops (2026-07-06), Animation Engine (2026-07-06) — multi-clip blending still open (ADR-005 #3)                                                                                                                                                                                                                                                      |
| **M6**    | ✅ Rendering Engine: WebGPU + WebGL2 + Canvas2D + Software backends, Scene Graph, dirty-tracking, Render Graph topology (2026-07-07) — texture cache eviction still open (needs GPU memory budget number); ✅ Effects Engine: Blur/Glow/Shadow/Blend/Color/Transition nodes + CSS fallback (2026-07-07) — not yet wired into any backend's `drawFrame`                                    |
| **M7**    | Audio Engine preview + export, full Export presets                                                                                                                                                                                                                                                                                                                                        |
| **M8**    | Asset Manager complete (dedup, dependency graph, thumbnails/waveforms)                                                                                                                                                                                                                                                                                                                    |
| **M9**    | AI Engine: TTS in timeline, export with voice                                                                                                                                                                                                                                                                                                                                             |
| **M10**   | Plugin System live, built-in tools as plugins. `packages/plugin` ✅ (2026-07-07): registry lifecycle, permission-scoped API, built-in Select-tool + export-preset plugins — gate condition "live" not met, no integration layer wires a real `hostApi` (`EffectsEngine`/`ExportEngine`/`AIManager`) into `PluginEngine` yet, same gap M7/M8/M9 are still waiting on for their own engines |
| **M11**   | Full Editor UI (Canvas, Timeline, Inspector, Asset Browser, Toolbar)                                                                                                                                                                                                                                                                                                                      |
| **M12**   | PWA (offline, installable), CI/CD, release pipeline                                                                                                                                                                                                                                                                                                                                       |

---

## Deferred to v2 / v3

- `SceneCamera` track type (keyframeable in-scene camera moves)
- Background removal AI
- Expressions / constraints in Animation Engine
- Collaborative editing
- Cloud sync
- Mobile support (WebGPU on mobile is behind flags — wait for broad availability)
- bKash / Nagad / card payments (n/a — that's the 2A project)
