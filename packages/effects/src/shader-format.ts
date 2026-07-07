/** Formats a number as a valid WGSL/GLSL float literal (both require a decimal point on whole numbers). */
export function formatFloat(n: number): string {
  return Number.isInteger(n) ? `${n}.0` : `${n}`;
}
