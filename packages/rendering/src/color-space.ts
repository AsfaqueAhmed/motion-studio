/**
 * Video decoded via WebCodecs arrives as YUV, not RGB — compositing it
 * against correctly-colored text/shapes without converting first produces
 * visibly wrong (washed-out/oversaturated) output. This closes the "Color
 * space handling is currently unspecified" gap flagged in
 * `renderer-overview.md`. Two standards matter in practice: BT.601 (older
 * SD content) and BT.709 (HD/most modern web video) — see
 * `05-rendering-engine/compositor.md`.
 */
export type ColorMatrixStandard = "bt601" | "bt709";

interface IYuvToRgbCoefficients {
  readonly kr: number;
  readonly kb: number;
}

// ITU-R BT.601 / BT.709 luma coefficients (kg is derived: 1 - kr - kb).
const COEFFICIENTS: Record<ColorMatrixStandard, IYuvToRgbCoefficients> = {
  bt601: { kr: 0.299, kb: 0.114 },
  bt709: { kr: 0.2126, kb: 0.0722 },
};

function clamp8(value: number): number {
  return Math.max(0, Math.min(255, Math.round(value)));
}

/**
 * Converts one full-range YUV sample (Y/U/V each 0-255, U/V centered at
 * 128) to RGB (each 0-255) using the given standard's matrix. WebCodecs'
 * `VideoFrame` reports its own matrix via `colorSpace.matrix` — pass
 * `"bt601"` for `"smpte170m"`/`"bt470bg"` and `"bt709"` for `"bt709"`
 * (the common case for HD web video).
 */
export function yuvToRgb(
  y: number,
  u: number,
  v: number,
  standard: ColorMatrixStandard = "bt709",
): [number, number, number] {
  const { kr, kb } = COEFFICIENTS[standard];
  const kg = 1 - kr - kb;
  const uCentered = u - 128;
  const vCentered = v - 128;

  const r = y + 2 * (1 - kr) * vCentered;
  const b = y + 2 * (1 - kb) * uCentered;
  const g = y - (2 * kr * (1 - kr) * vCentered + 2 * kb * (1 - kb) * uCentered) / kg;

  return [clamp8(r), clamp8(g), clamp8(b)];
}
