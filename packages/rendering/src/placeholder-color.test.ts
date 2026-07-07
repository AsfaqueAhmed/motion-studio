import { describe, expect, it } from "vitest";
import { placeholderColor } from "./placeholder-color";

describe("placeholderColor", () => {
  it("is deterministic for the same id", () => {
    expect(placeholderColor("layer-1")).toEqual(placeholderColor("layer-1"));
  });

  it("differs across ids (no collision for these fixtures)", () => {
    expect(placeholderColor("layer-1")).not.toEqual(placeholderColor("layer-2"));
  });

  it("produces channel values within [0, 255]", () => {
    const { r, g, b } = placeholderColor("some-arbitrary-id");
    for (const channel of [r, g, b]) {
      expect(channel).toBeGreaterThanOrEqual(0);
      expect(channel).toBeLessThanOrEqual(255);
    }
  });
});
