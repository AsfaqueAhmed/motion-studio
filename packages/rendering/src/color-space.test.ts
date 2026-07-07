import { describe, expect, it } from "vitest";
import { yuvToRgb } from "./color-space";

describe("yuvToRgb", () => {
  it("maps full-range white (Y=255, neutral chroma) to RGB white for both standards", () => {
    expect(yuvToRgb(255, 128, 128, "bt601")).toEqual([255, 255, 255]);
    expect(yuvToRgb(255, 128, 128, "bt709")).toEqual([255, 255, 255]);
  });

  it("maps full-range black (Y=0, neutral chroma) to RGB black for both standards", () => {
    expect(yuvToRgb(0, 128, 128, "bt601")).toEqual([0, 0, 0]);
    expect(yuvToRgb(0, 128, 128, "bt709")).toEqual([0, 0, 0]);
  });

  it("round-trips a saturated red through the BT.709 forward matrix", () => {
    // Forward Y'CbCr for pure red (255, 0, 0) under BT.709, full range.
    const kr = 0.2126;
    const kb = 0.0722;
    const y = kr * 255;
    const u = (0 - y) / (2 * (1 - kb)) + 128;
    const v = (255 - y) / (2 * (1 - kr)) + 128;

    const [r, g, b] = yuvToRgb(y, u, v, "bt709");
    expect(r).toBeCloseTo(255, 0);
    expect(g).toBeCloseTo(0, 0);
    expect(b).toBeCloseTo(0, 0);
  });

  it("defaults to BT.709 when no standard is given", () => {
    expect(yuvToRgb(255, 128, 128)).toEqual(yuvToRgb(255, 128, 128, "bt709"));
  });

  it("clamps out-of-range results to [0, 255]", () => {
    const [r, g, b] = yuvToRgb(255, 255, 255, "bt601");
    for (const channel of [r, g, b]) {
      expect(channel).toBeGreaterThanOrEqual(0);
      expect(channel).toBeLessThanOrEqual(255);
    }
  });
});
