# Layer Engine — Overview

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
`ViewportCamera`.)

## The Composition Graph

The **persistent**, saved-with-the-project structural hierarchy of
Layers: groups, nesting, parent-child transform relationships. This is
real project data, visualized by the Layers Panel (`../17-ui/`).
Distinct from the Rendering Engine's ephemeral per-frame Scene Graph —
the latter is built _from_ an evaluation of this graph at a given tick.
See `group-layer.md` and `../GLOSSARY.md`.

## Interaction with Timeline

Parenting (Composition Graph) affects transforms; Timeline linking
affects timing. These can coexist on the same Layer — an open item is
what happens on delete: does removing a parent Layer cascade through
Composition Graph children, Timeline-linked items, or both? Needs an
explicit rule before implementation.

## Interaction with Selection

Selection (in the editor framework) stores only Layer IDs, never Layer
objects directly — the Layer Engine remains the single source of truth,
avoiding stale references after undo/redo.
