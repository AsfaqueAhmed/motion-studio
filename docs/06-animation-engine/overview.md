# Animation Engine — Overview

Owns every animated property. Evaluates animations for a given tick.
Does not render, does not modify media, does not own project structure
— it only calculates values that feed into Frame State.

## Data model

```
Layer → Animation Clip → Property Track(s) → Keyframe(s)
```

An Animation Clip groups all property tracks for one Layer (Position,
Scale, Rotation, Opacity, Blur, Shadow, Glow, custom/plugin properties)
so animations are reusable (copy a "Fade In" clip onto another Layer),
not isolated per-property keyframe sets.

Keyframes use **ticks**, never floating-point time (see `../GLOSSARY.md`).
Property values are looked up via binary search over a sorted keyframe
array — O(log n).

## AnimatablePropertyRegistry

See `../GLOSSARY.md` — distinct from the Inspector's
`PropertySchemaRegistry`. Every animatable property is registered here
with its type, default, interpolator, and validation rule, so plugins
can add new keyframeable properties (e.g. a Particle effect's
`Emission Rate`) without modifying this engine.

## Multi-clip blending — open decision

Multiple clips (Idle/Hover/Click/Manual) can affect one Layer's same
property simultaneously. **This needs an explicit evaluation-order and
weighting rule before implementation** (e.g. ordered clip stack + per-
layer blend weight, similar to how game engine animators solve this) —
"blend modes exist" is not itself a resolution of evaluation order.

## Constraints and Expressions — same underlying problem

Constraints (Look At, Follow, Parent) and (future) Expressions both
imply a dependency graph between properties/layers that must be
evaluated in dependency order, with cycle detection (A follows B follows
A must be rejected or handled explicitly). This is the same unresolved
problem as multi-clip blending, and should be solved once, generically
— see `../DECISIONS.md` ADR-005, primitive #3.

## Performance goals

100,000 keyframes at 60fps; single-frame evaluation <1ms; only active
clips/tracks are evaluated per frame (never re-evaluate inactive
animations).
