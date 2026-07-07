# Easing

Named presets are cubic-bezier control-point tuples, in
`packages/animation/src/easing.ts`:

```ts
EASING_PRESETS = {
  easeIn: { x1: 0.42, y1: 0, x2: 1, y2: 1 },
  easeOut: { x1: 0, y1: 0, x2: 0.58, y2: 1 },
  easeInOut: { x1: 0.42, y1: 0, x2: 0.58, y2: 1 },
};
```

These are the standard CSS timing-function control points, fed into
`solveCubicBezier` (see `bezier.md`). A keyframe using `Linear`
interpolation doesn't need a preset at all (`t` is the raw fraction); a
keyframe using `Bezier` either references a preset's control points or
supplies fully custom ones via `IKeyframe.bezierControlPoints`.

## Open scope decision — bounce/elastic/back deferred

The original stub listed `bounce`, `elastic`, and `back` alongside
ease-in/out/in-out. Those oscillate (overshoot and settle), which is not
expressible as a single monotonic cubic-bezier curve — a real
implementation needs a separate parametric-function code path (e.g.
Robert Penner-style closed-form easing equations), not just another
`{x1,y1,x2,y2}` tuple. Not implemented this phase; PLAN.md's actual Phase
6 checklist only requires "ease-in, ease-out, ease-in-out, custom Bezier,"
which is fully covered. Flagged here rather than half-implemented.
