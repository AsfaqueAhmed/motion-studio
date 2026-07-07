import {
  InterpolationType,
  LayerType,
  PropertyValueType,
  toTick,
  type IKeyframe,
} from "@motion-studio/shared";
import { describe, expect, it } from "vitest";
import { evaluateSegment, SegmentLocator } from "./evaluator";
import { colorLerp, numberLerp, vector2Lerp, type IVector2 } from "./interpolators";
import type { IPropertyDefinition } from "./property-definition";

function numberKeyframe(
  tick: number,
  value: number,
  interpolation: InterpolationType,
): IKeyframe<number> {
  return { tick: toTick(tick), value, interpolation };
}

function keyframe<TValue>(
  tick: number,
  value: TValue,
  interpolation: InterpolationType,
): IKeyframe<TValue> {
  return { tick: toTick(tick), value, interpolation };
}

const numberDefinition: IPropertyDefinition<number> = {
  layerType: LayerType.Text,
  propertyKey: "test",
  valueType: PropertyValueType.Number,
  defaultValue: 0,
  interpolate: numberLerp,
  validate: () => true,
};

const colorDefinition: IPropertyDefinition<string> = {
  layerType: LayerType.Text,
  propertyKey: "fillColor",
  valueType: PropertyValueType.Color,
  defaultValue: "#000000",
  interpolate: colorLerp,
  validate: () => true,
};

const vector2Definition: IPropertyDefinition<IVector2> = {
  layerType: LayerType.Text,
  propertyKey: "transform.position",
  valueType: PropertyValueType.Vector2,
  defaultValue: { x: 0, y: 0 },
  interpolate: vector2Lerp,
  validate: () => true,
};

describe("SegmentLocator", () => {
  it("returns the constant left value before the first keyframe", () => {
    const keyframes = [
      numberKeyframe(300, 10, InterpolationType.Linear),
      numberKeyframe(900, 20, InterpolationType.Linear),
    ];
    const locator = new SegmentLocator();
    const segment = locator.locate(keyframes, toTick(0));
    expect(segment.left).toBe(keyframes[0]);
  });

  it("returns the constant last value at/after the last keyframe", () => {
    const keyframes = [
      numberKeyframe(0, 10, InterpolationType.Linear),
      numberKeyframe(900, 20, InterpolationType.Linear),
    ];
    const locator = new SegmentLocator();
    const segment = locator.locate(keyframes, toTick(900));
    expect(segment.left).toBe(keyframes[1]);
    expect(segment.right).toBeNull();
  });

  it("finds the bounding segment for a mid-range tick via binary search", () => {
    const keyframes = [
      numberKeyframe(0, 0, InterpolationType.Linear),
      numberKeyframe(300, 10, InterpolationType.Linear),
      numberKeyframe(600, 20, InterpolationType.Linear),
      numberKeyframe(900, 30, InterpolationType.Linear),
    ];
    const locator = new SegmentLocator();
    const segment = locator.locate(keyframes, toTick(650));
    expect(segment.left).toBe(keyframes[2]);
    expect(segment.right).toBe(keyframes[3]);
  });

  it("reuses the cached segment for a tick that advances within the same range", () => {
    const keyframes = [
      numberKeyframe(0, 0, InterpolationType.Linear),
      numberKeyframe(300, 10, InterpolationType.Linear),
      numberKeyframe(600, 20, InterpolationType.Linear),
    ];
    const locator = new SegmentLocator();
    locator.locate(keyframes, toTick(50));
    const second = locator.locate(keyframes, toTick(100));
    expect(second.left).toBe(keyframes[0]);
    expect(second.right).toBe(keyframes[1]);
  });

  it("invalidate forces a fresh search on the next locate", () => {
    const keyframes = [
      numberKeyframe(0, 0, InterpolationType.Linear),
      numberKeyframe(300, 10, InterpolationType.Linear),
      numberKeyframe(600, 20, InterpolationType.Linear),
    ];
    const locator = new SegmentLocator();
    locator.locate(keyframes, toTick(50));
    locator.invalidate();
    const after = locator.locate(keyframes, toTick(550));
    expect(after.left).toBe(keyframes[1]);
    expect(after.right).toBe(keyframes[2]);
  });

  it("throws on an empty keyframe array", () => {
    const locator = new SegmentLocator();
    expect(() => locator.locate([], toTick(0))).toThrow(/empty keyframe array/);
  });
});

describe("evaluateSegment", () => {
  it("Linear interpolates proportionally to elapsed ticks", () => {
    const left = numberKeyframe(0, 0, InterpolationType.Linear);
    const right = numberKeyframe(100, 100, InterpolationType.Linear);
    expect(evaluateSegment({ left, right }, toTick(25), numberDefinition)).toBe(25);
  });

  it("Step holds the left value until the right keyframe's tick", () => {
    const left = numberKeyframe(0, 0, InterpolationType.Step);
    const right = numberKeyframe(100, 100, InterpolationType.Step);
    expect(evaluateSegment({ left, right }, toTick(99), numberDefinition)).toBe(0);
    expect(evaluateSegment({ left, right }, toTick(100), numberDefinition)).toBe(100);
  });

  it("Bezier eases progress via the segment's control points", () => {
    const left: IKeyframe<number> = {
      tick: toTick(0),
      value: 0,
      interpolation: InterpolationType.Bezier,
      bezierControlPoints: { x1: 0, y1: 0, x2: 1, y2: 1 },
    };
    const right = numberKeyframe(100, 100, InterpolationType.Linear);
    expect(evaluateSegment({ left, right }, toTick(50), numberDefinition)).toBeCloseTo(50, 1);
  });

  it("returns the constant value when there is no right keyframe", () => {
    const left = numberKeyframe(900, 42, InterpolationType.Linear);
    expect(evaluateSegment({ left, right: null }, toTick(1200), numberDefinition)).toBe(42);
  });

  it("Bezier eases a Color property via colorLerp, not just Number", () => {
    const left: IKeyframe<string> = {
      tick: toTick(0),
      value: "#000000",
      interpolation: InterpolationType.Bezier,
      bezierControlPoints: { x1: 0, y1: 0, x2: 1, y2: 1 },
    };
    const right = keyframe(100, "#ffffff", InterpolationType.Linear);
    // Linear bezier control points reduce to a straight line, so this matches a plain colorLerp at t=0.5.
    expect(evaluateSegment({ left, right }, toTick(50), colorDefinition)).toBe("#808080");
  });

  it("Step holds the left Vector2 value until the right keyframe's tick", () => {
    const left = keyframe(0, { x: 0, y: 0 }, InterpolationType.Step);
    const right = keyframe(100, { x: 10, y: 20 }, InterpolationType.Step);
    expect(evaluateSegment({ left, right }, toTick(99), vector2Definition)).toEqual({ x: 0, y: 0 });
    expect(evaluateSegment({ left, right }, toTick(100), vector2Definition)).toEqual({
      x: 10,
      y: 20,
    });
  });
});
