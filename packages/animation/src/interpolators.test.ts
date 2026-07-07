import { describe, expect, it } from "vitest";
import { colorLerp, discreteLerp, numberLerp, vector2Lerp, vector3Lerp } from "./interpolators";

describe("interpolators", () => {
  it("numberLerp interpolates linearly", () => {
    expect(numberLerp(0, 10, 0.5)).toBe(5);
    expect(numberLerp(10, 20, 0)).toBe(10);
    expect(numberLerp(10, 20, 1)).toBe(20);
  });

  it("vector2Lerp interpolates each component independently", () => {
    expect(vector2Lerp({ x: 0, y: 10 }, { x: 10, y: 0 }, 0.5)).toEqual({ x: 5, y: 5 });
  });

  it("vector3Lerp interpolates each component independently", () => {
    expect(vector3Lerp({ x: 0, y: 0, z: 0 }, { x: 10, y: 20, z: 30 }, 0.5)).toEqual({
      x: 5,
      y: 10,
      z: 15,
    });
  });

  it("colorLerp interpolates hex channels", () => {
    expect(colorLerp("#000000", "#FFFFFF", 0.5)).toBe("#808080");
    expect(colorLerp("#000000", "#FFFFFF", 0)).toBe("#000000");
    expect(colorLerp("#000000", "#FFFFFF", 1)).toBe("#ffffff");
  });

  it("colorLerp throws on a non hex-6 value", () => {
    expect(() => colorLerp("transparent", "#FFFFFF", 0.5)).toThrow(/expected a "#rrggbb"/);
  });

  it("discreteLerp holds `a` until t reaches 1", () => {
    expect(discreteLerp("A", "B", 0)).toBe("A");
    expect(discreteLerp("A", "B", 0.99)).toBe("A");
    expect(discreteLerp("A", "B", 1)).toBe("B");
  });
});
