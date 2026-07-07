# Animation Engine — Overview

Owns every animated property. Evaluates animations for a given tick.
Does not render, does not modify media, does not own project structure
— it only calculates values that feed into Frame State.

## Data model

```
Layer → Animation Clip → Property Track(s) → Keyframe(s)
```

Implemented in `packages/animation` (`AnimationEngine`) on top of data
shapes in `@motion-studio/shared` (`IAnimationClip`/`IPropertyTrack`/
`IKeyframe`, in `animation.ts`) — same convention as `ILayer`/`ITrackItem`
living in shared rather than the owning engine's package.

An Animation Clip groups all property tracks for one Layer (Position,
Scale, Rotation, Opacity, Blur, Shadow, Glow, custom/plugin properties)
so animations are reusable (copy a "Fade In" clip onto another Layer),
not isolated per-property keyframe sets. `IAnimationClip.layerType` is
denormalized from the Layer at creation time (safe — a Layer's type never
changes) so `AnimatablePropertyRegistry` can resolve property definitions
by `(layerType, propertyKey)` without the Animation Engine importing the
Layer Engine's concrete classes.

Keyframes use **ticks**, never floating-point time (see `../GLOSSARY.md`).
Property values are looked up via a `SegmentLocator` that caches the last
resolved keyframe pair and only re-runs a binary search when a tick lands
outside it — see `animation-player.md`.

## AnimatablePropertyRegistry

See `../GLOSSARY.md` — distinct from the Inspector's
`PropertySchemaRegistry`. Every animatable property is registered here
with its type, default, interpolator, and validation rule, keyed by
`(LayerType, propertyKey)`, so plugins can add new keyframeable properties
(e.g. a Particle effect's `Emission Rate`) without modifying this engine.
`registerBuiltinProperties` (`builtin-properties.ts`) seeds the baseline
surface every Layer type has today (`transform.x/y/scaleX/scaleY/rotation`,
`opacity`) plus each type's own fields (Text: `fontSize`/`color`; Shape:
`fillColor`/`strokeColor`/`strokeWidth`/`cornerRadius`; Audio: `volume`).

## Multi-clip blending — still an open decision

**Not implemented.** `AnimationEngine.addClip` throws if a Layer already
has a Clip — today one Layer has at most one AnimationClip. Multiple
clips (Idle/Hover/Click/Manual) affecting one Layer's same property
simultaneously still needs an explicit evaluation-order and weighting
rule before implementation (e.g. ordered clip stack + per-layer blend
weight) — "blend modes exist" is not itself a resolution of evaluation
order. See `../DECISIONS.md` ADR-005 primitive #3.

## Constraints and Expressions — same underlying problem, still deferred

Constraints (Look At, Follow, Parent) and (future) Expressions both
imply a dependency graph between properties/layers that must be
evaluated in dependency order, with cycle detection (A follows B follows
A must be rejected or handled explicitly). Not implemented this phase —
same unresolved problem as multi-clip blending, to be solved once,
generically, via the ADR-005 primitive #3 DAG evaluator when Constraints/
Expressions are actually built.

## Performance goals

100,000 keyframes at 60fps; single-frame evaluation <1ms; only active
clips/tracks are evaluated per frame (never re-evaluate inactive
animations). `SegmentLocator`'s cached-segment fast path is the concrete
mechanism for the "never re-evaluate" half of this — see
`animation-player.md`.
