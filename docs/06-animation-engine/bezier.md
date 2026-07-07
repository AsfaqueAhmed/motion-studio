# Bezier

`solveCubicBezier(t, points)` (`packages/animation/src/easing.ts`) solves
a CSS-style cubic-bezier easing curve for a linear time fraction `t` in
[0, 1] using Newton-Raphson iteration (8 iterations, `1e-7` epsilon),
mirroring the standard `UnitBezier` approach browsers use for CSS timing
functions. Control points are `{x1, y1, x2, y2}`, each axis in [0, 1].

Applied per keyframe segment in `evaluator.ts`'s `evaluateSegment`: when
the segment's left keyframe has `interpolation: Bezier`, the raw time
fraction through the segment is passed through `solveCubicBezier` (using
that keyframe's `bezierControlPoints`, or an `easeInOut`-shaped default of
`{0.42, 0, 0.58, 1}` if none was supplied) before being handed to the
property's value-type interpolator.

## Graph editor support — not implemented

No curve-editing UI exists yet (Phase 15, Inspector/graph editor). This
doc only covers the math primitive the future graph editor would
manipulate — dragging handles in a UI would just be writing new
`{x1,y1,x2,y2}` values via `ModifyKeyframeCommand`.
