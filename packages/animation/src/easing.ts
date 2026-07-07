import type { ICubicBezierControlPoints } from "@motion-studio/shared";

const NEWTON_ITERATIONS = 8;
const NEWTON_EPSILON = 1e-7;

function bezierComponent(t: number, p1: number, p2: number): number {
  const c = 3 * p1;
  const b = 3 * (p2 - p1) - c;
  const a = 1 - c - b;
  return ((a * t + b) * t + c) * t;
}

function bezierComponentDerivative(t: number, p1: number, p2: number): number {
  const c = 3 * p1;
  const b = 3 * (p2 - p1) - c;
  const a = 1 - c - b;
  return (3 * a * t + 2 * b) * t + c;
}

/**
 * Solves a CSS-style cubic-bezier easing curve for a linear time fraction
 * `t` in [0, 1] (Newton-Raphson, mirroring the standard `UnitBezier`
 * approach used by browser timing functions). The result is the eased
 * progress fed into a property's interpolator. See
 * docs/06-animation-engine/bezier.md.
 */
export function solveCubicBezier(t: number, points: ICubicBezierControlPoints): number {
  if (t <= 0) return 0;
  if (t >= 1) return 1;

  let x = t;
  for (let i = 0; i < NEWTON_ITERATIONS; i++) {
    const currentX = bezierComponent(x, points.x1, points.x2) - t;
    if (Math.abs(currentX) < NEWTON_EPSILON) {
      break;
    }
    const derivative = bezierComponentDerivative(x, points.x1, points.x2);
    if (Math.abs(derivative) < NEWTON_EPSILON) {
      break;
    }
    x -= currentX / derivative;
  }
  return bezierComponent(x, points.y1, points.y2);
}

/**
 * Named cubic-bezier presets — see docs/06-animation-engine/easing.md.
 * `bounce`/`elastic`/`back` from the original stub are deferred: they
 * oscillate and aren't expressible as a single monotonic cubic-bezier
 * curve, so they'd need a separate parametric-function code path. Flagged
 * as an open scope decision in the doc rather than half-implemented.
 */
export const EASING_PRESETS = {
  easeIn: { x1: 0.42, y1: 0, x2: 1, y2: 1 },
  easeOut: { x1: 0, y1: 0, x2: 0.58, y2: 1 },
  easeInOut: { x1: 0.42, y1: 0, x2: 0.58, y2: 1 },
} as const satisfies Record<string, ICubicBezierControlPoints>;

export type EasingPresetName = keyof typeof EASING_PRESETS;
