import { describe, expect, it } from "vitest";
import { worldBounds } from "./transform";

const identity = { x: 0, y: 0, scaleX: 1, scaleY: 1, rotation: 0, anchorX: 0, anchorY: 0 };

describe("worldBounds", () => {
  it("returns local bounds unchanged under the identity transform", () => {
    const bounds = { x: 10, y: 20, width: 100, height: 50 };
    expect(worldBounds(bounds, identity)).toEqual(bounds);
  });

  it("translates bounds by transform.x/y", () => {
    const bounds = { x: 0, y: 0, width: 10, height: 10 };
    expect(worldBounds(bounds, { ...identity, x: 5, y: 7 })).toEqual({
      x: 5,
      y: 7,
      width: 10,
      height: 10,
    });
  });

  it("scales bounds around the anchor", () => {
    const bounds = { x: 0, y: 0, width: 10, height: 10 };
    const result = worldBounds(bounds, { ...identity, scaleX: 2, scaleY: 2 });
    expect(result).toEqual({ x: 0, y: 0, width: 20, height: 20 });
  });

  it("produces an axis-aligned box around a rotated square", () => {
    const bounds = { x: -5, y: -5, width: 10, height: 10 };
    const result = worldBounds(bounds, { ...identity, rotation: Math.PI / 4 });
    const diagonal = 10 * Math.SQRT2;
    expect(result.width).toBeCloseTo(diagonal, 5);
    expect(result.height).toBeCloseTo(diagonal, 5);
    expect(result.x).toBeCloseTo(-diagonal / 2, 5);
    expect(result.y).toBeCloseTo(-diagonal / 2, 5);
  });
});
