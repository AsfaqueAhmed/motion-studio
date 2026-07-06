---
name: motion-studio-project-overview
description: "What Motion Studio is, its tech stack, and key architecture constraints"
metadata: 
  node_type: memory
  type: project
  originSessionId: 8c3bfdf3-80ce-49f5-b408-a98ac9d4171b
---

Motion Studio is a 100% browser-based, offline-capable motion graphics engine (not a video editor). The internal engine is called MSE. No media ever leaves the device.

**Why:** Privacy-first, local-only design. GPU-accelerated where available, graceful fallback where not.

**How to apply:** Every feature must work offline. Every GPU-dependent feature needs a tested fallback chain: WebGPU → WebGL2 → Canvas2D. No server calls for media processing.

Key files:
- `docs/ARCHITECTURE.md` — authoritative system map
- `docs/DECISIONS.md` — tiebreaker for all design conflicts
- `docs/GLOSSARY.md` — canonical naming (use before naming anything in code)
- `docs/24-roadmap/mvp.md` — implementation start point
- `CLAUDE.md` — soul file with all rules and constraints
- `PLAN.md` — full phased implementation plan (17 phases, 12 milestones)

Tech stack: Next.js + React + TypeScript, TailwindCSS, Zustand (UI-only state), WebGPU/WebGL2/Canvas2D, WebCodecs, OPFS, IndexedDB, ONNX Runtime Web (TTS/AI), Web Audio API, dnd-kit.

Status: Phase 0 (spikes) through Phase 5 (Timeline Engine) complete as of 2026-07-06. Repo is a pnpm+Turborepo workspace: `packages/shared` (fully typed: Tick, FrameState, ILayer union + IAnimatableLayer, IComposition/ITrack/ITrackItem, ICommand, IIntent, IEvent+catalog, all enums, per-engine `I*Engine` lifecycle interfaces, generic `Hierarchy<TId>` primitive), `packages/core` (Container DI, ServiceLocator, AppEngine, EventBus, Scheduler, WorkerManager — 40 Vitest tests), `packages/storage` (StorageEngine/IVFS routing IndexedDB+OPFS adapters, ProjectRepository with migration+backup, AssetBlobStore, ThumbnailCache, WaveformRepository — 45 Vitest tests, see [[project_phase3_storage_engine]]), `packages/layer` (LayerRegistry, CompositionGraph, 7 layer-type factories, LayerEngine — 26 Vitest tests, see [[project_phase4_layer_engine]]), `packages/timeline` (CompositionRegistry/TrackRegistry/TrackItemRegistry, TimelineEngine with no-overlap invariant, Playhead, 5 edit-op Commands — the first real `ICommand` implementations, snapping utilities — 47 Vitest tests, see [[project_phase5_timeline_engine]]), 8 remaining empty stub engine packages (`assets, animation, rendering, effects, audio, export, ai, history, plugin`, each `export {}` only), and `apps/studio` (minimal Next.js 14 App Router shell, builds/renders). All 18 workspace packages pass `pnpm build`/`lint`/`test` (note: workspace-wide `pnpm typecheck` has a pre-existing, unrelated `tsc -b --noEmit` composite-references failure — not a regression from any completed phase). Phase 5 work happened on branch `phase-5-timeline-engine` (branched from `phase-4-layer-engine`, linear branch chain, none merged to main) per [[feedback_phase_branching]] — not yet committed (user hasn't asked). Phase 6 (Animation Engine) is next. See [[project_phase0_spike_findings]] for spike findings, [[project_phase1_scaffold_decisions]] for scaffold-specific choices, [[project_phase2_core_engine]] for Core Engine decisions, [[project_phase3_storage_engine]] for Storage Engine decisions, [[project_phase4_layer_engine]] for Layer Engine decisions, and [[project_phase5_timeline_engine]] for Timeline Engine decisions.
