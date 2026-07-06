---
name: project-phase4-layer-engine
description: "Phase 4 Layer Engine implementation decisions and API shapes (LayerRegistry, CompositionGraph, generic Hierarchy primitive, per-type factories)"
metadata: 
  node_type: memory
  type: project
  originSessionId: 299414d6-43ad-4325-877a-c56b9879b815
---

Phase 4 (Layer Engine, `packages/layer`) is complete as of 2026-07-06, on
branch `phase-4-layer-engine` (not yet merged to main), following
[[feedback_phase_branching]].

**Why this shape:** ADR-005 calls for a generic "persistent hierarchy"
primitive reused by the Composition Graph (this phase) and the future
Asset Dependency Graph (Phase 12). Rather than have that primitive own its
own copy of the tree, `Hierarchy<TId>` (`@motion-studio/shared/src/hierarchy.ts`)
is storage-free: it reads `parentId`/`childIds` through a caller-supplied
accessor. `CompositionGraph` binds that accessor to `LayerRegistry`, so the
actual `ILayer` objects' `parentId`/`childIds` fields remain the only copy
of the tree — nothing to go out of sync. When Phase 12 builds the Asset
Dependency Graph, it should bind its own accessor over whatever node shape
it needs rather than duplicating this or inventing a fourth graph type.

**How to apply:** Phase 5 (Timeline) and later Phase 15 (Editor Service)
should depend on `LayerRegistry`/`CompositionGraph`/`LayerEngine` from
`@motion-studio/layer`, and on `ILayer`/`IAnimatableLayer` from
`@motion-studio/shared` — never reach into `@motion-studio/layer`'s
internals from another engine package.

Key shapes:
- `ILayer` discriminated union (7 variants: Video/Image/Audio/Text/Sticker/Shape/Group) and `ILayerBase.parentId: LayerId | null` already existed in `@motion-studio/shared/src/layer.ts` from Phase 1 scaffolding; this phase added `parentId` usage + `IAnimatableLayer` (currently `= ILayerBase`, since every layer type has the animatable `transform`/`opacity` baseline today — kept as a distinct alias so future non-animatable layer types don't require touching every consumer).
- `LayerRegistry`: dumb `Map<LayerId, ILayer>` store (`add/get/has/remove/getAll/clear`). No hierarchy awareness.
- `CompositionGraph`: the only thing allowed to mutate `parentId`/`childIds` once a layer is added. `addLayer`/`reparent` validate the parent is a `Group` layer (only Group layers may have children — every other type is a leaf, via `isGroupLayer` guard in `layer-guards.ts`) and that `reparent` wouldn't create a cycle (via `Hierarchy.assertNoCycle`) before mutating anything. Also exposes `isEffectivelyVisible`/`isEffectivelyLocked` (ancestor-inherited).
- `removeLayer(id)` fails fast (throws) if the layer still has children, rather than picking a cascade policy — the cascade-on-delete question (does removing a parent Layer cascade through Composition Graph children, Timeline-linked items, or both?) was already flagged as open in `docs/08-layer-engine/overview.md` before this phase and is now cross-referenced against ADR-010 (ripple-delete). Both should likely be resolved together once a `DeleteLayerCommand` is designed (Phase 11/15) — deliberately not decided in Phase 4.
- `layer-factory.ts`: one `createXLayer(input)` per type with documented defaults (e.g. `createTextLayer` defaults `fontFamily: "Inter"`, `fontSize: 48`; `createShapeLayer` defaults `shape: "rectangle"`). IDs are always caller-supplied, never generated inside the factory — same convention as Storage's `ProjectRepository` expecting a pre-assigned id.
- `LayerEngine implements IEngine`: owns one `LayerRegistry` + one `CompositionGraph`, no async setup needed (both ready on construction), `dispose()` clears the registry.
- `TextLayer`'s richer typography (kerning, letter spacing, line height, stroke, shadow, gradient — named in the doc title) was deliberately **not** added to `ITextLayer` this phase — none of Rendering/Effects/Inspector exist yet to consume them, and stroke/shadow may end up as generic Effects Engine nodes (Phase 9) rather than Text-specific fields. Flagged as an open question in `docs/08-layer-engine/text-layer.md`.
- `ShapeLayer` kept flat (one `cornerRadius` field even though only meaningful for `"rectangle"`) rather than a discriminated union per shape kind — no consumer yet to justify the complexity.
- `IStickerLayer`/`createStickerLayer` implemented even though PLAN.md's Phase 4 checklist (4.2) doesn't explicitly list Sticker — it already existed in shared's `ILayer` union from Phase 1, and the registry/graph must handle all 7 variants regardless, so leaving it uncreatable would've been an arbitrary gap.
- No engine emits to Core's `EventBus` for layer mutations (no `LayerAdded`/`LayerReparented` event exists in `AppEventMap` yet) — matches Storage's precedent (`StorageEngine`/`ProjectRepository` don't touch `EventBus` either); event emission is a higher-level Editor Service concern (Phase 15), not the data-model engine's job.
- Updated `docs/08-layer-engine/*.md` stubs (overview, group-layer, video/image/audio/text/shape/sticker-layer) with real findings, per [[feedback_docs_workflow]].
- 32 new Vitest unit tests (26 in `packages/layer`, 6 for `Hierarchy` in `packages/shared`), all passing; full workspace `pnpm build`/`lint`/`test` clean; `pnpm --filter @motion-studio/layer typecheck` and `@motion-studio/shared typecheck` both clean individually (the pre-existing workspace-wide `tsc -b --noEmit` composite-references issue noted in [[project_phase3_storage_engine]] is unrelated and untouched).

Phase 5 (Timeline Engine, `packages/timeline`) is next per PLAN.md.
