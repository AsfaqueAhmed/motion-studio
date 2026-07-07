/**
 * Deterministic placeholder color derived from a layer id. Every backend
 * draws a flat colored rect per Scene Graph node instead of real pixel
 * content — decoded video/image textures, rasterized text, and vector
 * shape fills all require the Assets/Effects pipelines that don't exist
 * yet (Phases 8/9/12). This proves the Frame State → Scene Graph → Render
 * Graph → GPU backend pipeline end-to-end now; swapping in real per-type
 * content is additive once those engines land — see
 * `05-rendering-engine/compositor.md`.
 */
export interface IRgb {
  readonly r: number;
  readonly g: number;
  readonly b: number;
}

export function placeholderColor(id: string): IRgb {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = (hash * 31 + id.charCodeAt(i)) | 0;
  }
  const r = (hash & 0xff0000) >>> 16;
  const g = (hash & 0x00ff00) >>> 8;
  const b = hash & 0x0000ff;
  return { r, g, b };
}
