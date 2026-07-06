---
name: project-phase5-timeline-engine
description: "Phase 5 Timeline Engine decisions — Composition/Track/TrackItem shape, TimelineEngine invariants, Playhead/Scheduler split, first real ICommand implementations, ADR-010 still open"
metadata: 
  node_type: memory
  type: project
  originSessionId: 8b7d85c7-85d0-47e1-84d9-21fa9ce54f44
---

Phase 5 (`packages/timeline`) implemented on branch `phase-5-timeline-engine`, built on top of `phase-4-layer-engine` (branches are linear, none merged to main yet — see [[feedback_phase_branching]]).

**Data model** — `IComposition`/`ITrack`/`ITrackItem` live in `@motion-studio/shared` (`packages/shared/src/timeline.ts`), same convention as `ILayer` living in shared rather than the owning engine's package, since other engines (Rendering, Export, Animation) will need to reference them later.

- `ITrackItem` deviates from the original spec sketch (`startTime/endTime/offset/speed`): no `speed` field (Video/Audio layers already carry `playbackRate` from Phase 4 — duplicating would let them drift), no stored `endTime` (derived from `startTick + durationTicks` so it can't go stale after a trim), and `offset` split into `trimInTick`/`trimOutTick` (two independent source-media bounds, since both clip edges need independent trim).

**TimelineEngine, not a second "Graph" class** — Considered mirroring Layer Engine's `LayerRegistry` + `CompositionGraph` split, but named the coordinator `TimelineEngine` itself rather than inventing a "TimelineGraph"/"CompositionGraph"-adjacent name, since "Composition Graph" and "Timeline Evaluation Graph" are both already reserved terms in GLOSSARY.md/ADR-005/ADR-006 for different things. `TimelineEngine` owns three flat bespoke registries (Composition/Track/TrackItem, mirroring `LayerRegistry`'s shape) and is the only thing allowed to mutate `IComposition.tracks`/`ITrack.items` after creation. It enforces one hard invariant everywhere (add/move/trim): no two TrackItems may overlap on the same track; adjacent (touching) items are explicitly allowed.

**Playhead does not run its own raf loop** — Core's `Scheduler` (Phase 2) already owns wall-clock→tick timing with the same play/pause/seek/stop surface. `Playhead` (in `@motion-studio/timeline`) is pure tick-domain: holds duration bounds + loop points + frame-stepping, and exposes `advance(deltaTicks)` meant to be driven by Scheduler's `onTimelineUpdate` hook once the Editor Service wires them together (not done yet — no Editor Service exists). This avoids duplicating the raf/timing logic that Phase 2 already built.

**First real `ICommand` implementations** — Phase 4 built no Commands (`ICommand` existed in shared but nothing implemented it). Phase 5's five edit-op commands (`MoveTrackItemCommand`, `TrimTrackItemCommand`, `SplitTrackItemCommand`, `DeleteTrackItemCommand`, `RippleDeleteCommand`) are the first, and are standalone/self-contained since [[project_phase3_storage_engine]]'s History Engine (Phase 11) still doesn't exist — they're ready to be pushed onto History's undo/redo stacks later but don't depend on it now.

**ADR-010 still open** — `RippleDeleteCommand` only ripples items on the *same track* as the deleted item. `ITrackItem` has no "linked to" field, so cross-track linked ripple (the ADR-010 recommended default) has nothing to follow yet. Flagged explicitly in `docs/07-timeline-engine/ripple.md` and PLAN.md rather than half-implemented — do not assume linked ripple works before ADR-010 is resolved and a linking field is added to the schema.

**Not implemented (explicitly deferred, not oversights):** ripple trim, slip, slide, ripple insert, markers/guides as snap targets, multi-track split, nested compositions. All are additive — no `ITrackItem`/`ITrack`/`IComposition` shape changes anticipated to add them later.

Docs updated: all of `docs/07-timeline-engine/*.md` (overview, tracks, clips, playback, trimming, splitting, ripple, snapping) replaced with real API shapes per [[feedback_docs_workflow]]. `drag-drop.md` and `grouping.md` were left as stubs — not in Phase 5's PLAN.md checklist (drag/drop is Phase 15 UI, grouping wasn't scoped).

Full monorepo `pnpm build`/`pnpm lint`/`pnpm test` all pass after this phase (16 packages, no regressions). Note: `tsc -b --noEmit` fails with a pre-existing `TS6310` error on every package in this repo (composite project references can't disable emit) — this predates Phase 5 (reproduces on `@motion-studio/layer` too); use `pnpm --filter <pkg> build` to typecheck instead.
