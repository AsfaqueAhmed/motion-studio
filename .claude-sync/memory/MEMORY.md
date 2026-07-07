# Memory Index

- [Motion Studio project overview](project_motion_studio.md) — What it is, tech stack, key files, current status (Phase 0-2 complete)
- [Phase 2 Core Engine decisions](project_phase2_core_engine.md) — Container/ServiceLocator/AppEngine/EventBus/Scheduler/WorkerManager API shapes and calls made without explicit spec backing
- [Phase 3 Storage Engine decisions](project_phase3_storage_engine.md) — VFS/IndexedDB/OPFS adapters, project schema v1, migration runner, backup-before-migrate (restore API still open), asset/thumbnail/waveform caches
- [Phase 4 Layer Engine decisions](project_phase4_layer_engine.md) — LayerRegistry/CompositionGraph/generic Hierarchy primitive (ADR-005), 7 layer-type factories, delete-cascade left open (flagged with ADR-010)
- [Phase 5 Timeline Engine decisions](project_phase5_timeline_engine.md) — Composition/Track/TrackItem in shared, TimelineEngine invariants (no-overlap), Playhead driven by Core's Scheduler, first ICommand impls, ADR-010 still open (single-track ripple only)
- [Phase 6 Animation Engine decisions](project_phase6_animation_engine.md) — Keyframe/PropertyTrack/AnimationClip in shared, AnimatablePropertyRegistry keyed by (LayerType, propertyKey), cubic-bezier easing, SegmentLocator incremental eval, multi-clip blending still open (ADR-005 #3)
- [Phase 7 Rendering Engine decisions](project_phase7_rendering_engine.md) — IRenderBackend x4 (WebGPU/WebGL2/Canvas2D/Software), Dag+DirtyTrackedGraph added to shared (ADR-005 #1/#3), placeholder-only content, texture cache eviction still open, fixed repo-wide tsc -b --noEmit bug
- [Phase 8 Effects Engine decisions](project_phase8_effects_engine.md) — IEffectNode shape (structurally compatible with Rendering's IRenderGraphNode), Blur/Glow/Shadow/BlendMode/ColorAdjustment/Transition factories, params baked as shader consts, no backend wiring yet
- [Phase 1 scaffold decisions](project_phase1_scaffold_decisions.md) — Conventions set where docs were stubs: npm scope, minimal I*Engine interfaces, ExportPreset, import-boundary gaps
- [Phase 0 spike findings](project_phase0_spike_findings.md) — Export pipeline passed (Mediabunny replaces mp4box.js/mp4-muxer, ADR-012); TTS pipeline confirmed but 14s generate time misses <5s target
- [Architecture non-negotiables](project_architecture_rules.md) — UI/engine separation, Tick time, Frame State invariant, VFS-only storage access
- [Docs update workflow](feedback_docs_workflow.md) — Fill stub docs as each engine is built; spikes update docs/13-export/ and docs/11-ai/ first
- [Phase branching](feedback_phase_branching.md) — Create a new git branch named after the phase when starting each PLAN.md phase
