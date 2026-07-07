import { describe, expect, it } from "vitest";
import { EASING_PRESETS, solveCubicBezier } from "./easing";

describe("solveCubicBezier", () => {
  it("returns 0 at t=0 and 1 at t=1 for every named preset", () => {
    for (const points of Object.values(EASING_PRESETS)) {
      expect(solveCubicBezier(0, points)).toBeCloseTo(0);
      expect(solveCubicBezier(1, points)).toBeCloseTo(1);
    }
  });

  it("linear control points (0,0,1,1) solve to an identity curve", () => {
    const linear = { x1: 0, y1: 0, x2: 1, y2: 1 };
    expect(solveCubicBezier(0.25, linear)).toBeCloseTo(0.25, 4);
    expect(solveCubicBezier(0.5, linear)).toBeCloseTo(0.5, 4);
    expect(solveCubicBezier(0.75, linear)).toBeCloseTo(0.75, 4);
  });

  it("easeIn front-loads slower progress (below the identity line before the midpoint)", () => {
    const eased = solveCubicBezier(0.25, EASING_PRESETS.easeIn);
    expect(eased).toBeLessThan(0.25);
  });

  it("easeOut front-loads faster progress (above the identity line before the midpoint)", () => {
    const eased = solveCubicBezier(0.25, EASING_PRESETS.easeOut);
    expect(eased).toBeGreaterThan(0.25);
  });

  it("clamps out-of-range input", () => {
    expect(solveCubicBezier(-1, EASING_PRESETS.easeInOut)).toBe(0);
    expect(solveCubicBezier(2, EASING_PRESETS.easeInOut)).toBe(1);
  });
});
