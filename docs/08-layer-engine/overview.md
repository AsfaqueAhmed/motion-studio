# Layer Engine — Overview

> Status: Implemented (Phase 4, `packages/layer`). See `group-layer.md` for
> the Composition Graph shape and the six per-type docs for their fields.

**This folder resolves a real naming collision found across earlier
design drafts** — see `../DECISIONS.md` ADR-003 and `../GLOSSARY.md`.
`Entity` (from Timeline drafts) and `Scene Graph Object` (from an early
Layers Panel draft) are retired in favor of one canonical term: `Layer`.

## What a Layer is

The canonical unit of "what" something is — independent of _when_ it
appears (Timeline's job) or its transient render-time representation
(Rendering Engine's ephemeral Scene Graph). A Layer is referenced by
TrackItems, potentially many times, without duplication.

## Layer types

Image, Video, Audio, Text, Sticker, Shape, Group. (Future: SceneCamera
— see `../GLOSSARY.md` for the distinction from the editing
`ViewportCamera`.) All seven type interfaces (`ILayer` discriminated
union) live in `@motion-studio/shared`'s `layer.ts`, not in
`@motion-studio/layer` — see "Package shape" below for why.

## Package shape (`@motion-studio/layer`)

- `LayerRegistry` — in-memory `Map<LayerId, ILayer>`. Has no hierarchy
  awareness of its own; it only knows about individual layers.
- `CompositionGraph` — wraps a `LayerRegistry` and is the **only** thing
  allowed to mutate `ILayerBase.parentId` / `IGroupLayer.childIds` once a
  layer has been added, so the two can never drift out of sync with each
  other. Built on the generic `Hierarchy<TId>` primitive from
  `@motion-studio/shared` (ADR-005 primitive #2) rather than a bespoke
  tree — see `group-layer.md`.
- `layer-factory.ts` — one `createXLayer(input)` function per layer type,
  applying documented defaults (see each per-type doc). IDs are always
  caller-supplied (from the future Editor Service), never generated
  inside the factory — consistent with how Storage's `ProjectRepository`
  expects a pre-assigned `ProjectId`.
- `LayerEngine` — the `IEngine` entry point; owns one `LayerRegistry` and
  one `CompositionGraph`. No async setup: both are ready as soon as the
  engine is constructed.

Why `ILayer`/`IAnimatableLayer` live in `@motion-studio/shared` and not
here: the Animation Engine (Phase 6) needs to reference "a layer" and "is
this layer animatable" without depending on the concrete `LayerEngine`
class — only on the shared interface, per CLAUDE.md's "engines
communicate through interfaces... never by importing each other's
concrete classes."

## The Composition Graph

The **persistent**, saved-with-the-project structural hierarchy of
Layers: groups, nesting, parent-child transform relationships. This is
real project data, visualized by the Layers Panel (`../17-ui/`).
Distinct from the Rendering Engine's ephemeral per-frame Scene Graph —
the latter is built _from_ an evaluation of this graph at a given tick.
See `group-layer.md` and `../GLOSSARY.md`.

## Interaction with Timeline

Parenting (Composition Graph) affects transforms; Timeline linking
affects timing. These can coexist on the same Layer.

**Still open:** what happens on delete — does removing a parent Layer
cascade through Composition Graph children, Timeline-linked items, or
both? `CompositionGraph.removeLayer` deliberately does **not** decide
this: it throws if the layer still has children, forcing the caller
(a future `DeleteLayerCommand`) to make an explicit choice rather than
this layer silently picking a cascade policy. Mirrors how `ADR-010`
(ripple-delete of linked Timeline items) is also still open — both
should probably be resolved together, since "delete" on a grouped,
Timeline-linked Layer touches both graphs.

## Interaction with Selection

Selection (in the editor framework) stores only Layer IDs, never Layer
objects directly — the Layer Engine remains the single source of truth,
avoiding stale references after undo/redo.
