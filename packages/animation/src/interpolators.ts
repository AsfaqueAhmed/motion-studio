/** See docs/06-animation-engine/interpolation.md. */
export function numberLerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export interface IVector2 {
  x: number;
  y: number;
}

export function vector2Lerp(a: IVector2, b: IVector2, t: number): IVector2 {
  return { x: numberLerp(a.x, b.x, t), y: numberLerp(a.y, b.y, t) };
}

export interface IVector3 {
  x: number;
  y: number;
  z: number;
}

export function vector3Lerp(a: IVector3, b: IVector3, t: number): IVector3 {
  return { x: numberLerp(a.x, b.x, t), y: numberLerp(a.y, b.y, t), z: numberLerp(a.z, b.z, t) };
}

function hexToRgb(hex: string): [number, number, number] {
  const match = /^#([0-9a-fA-F]{6})$/.exec(hex);
  if (!match) {
    throw new Error(`colorLerp: expected a "#rrggbb" hex color, got "${hex}"`);
  }
  const value = parseInt(match[1]!, 16);
  return [(value >> 16) & 0xff, (value >> 8) & 0xff, value & 0xff];
}

function rgbToHex(r: number, g: number, b: number): string {
  return `#${[r, g, b].map((channel) => channel.toString(16).padStart(2, "0")).join("")}`;
}

/**
 * Interpolates `#rrggbb` hex colors channel-wise. Alpha and non-hex formats
 * (named colors, `hsl()`, `transparent`) are not supported yet — see
 * docs/06-animation-engine/interpolation.md open questions.
 */
export function colorLerp(a: string, b: string, t: number): string {
  const [ar, ag, ab] = hexToRgb(a);
  const [br, bg, bb] = hexToRgb(b);
  return rgbToHex(
    Math.round(numberLerp(ar, br, t)),
    Math.round(numberLerp(ag, bg, t)),
    Math.round(numberLerp(ab, bb, t)),
  );
}

/**
 * Fallback for value types with no continuous interpolation implemented yet
 * (Boolean, Text, Gradient, Matrix — see
 * docs/06-animation-engine/interpolation.md open questions): holds `a`
 * until `t` reaches 1, then snaps to `b`.
 */
export function discreteLerp<TValue>(a: TValue, b: TValue, t: number): TValue {
  return t >= 1 ? b : a;
}
