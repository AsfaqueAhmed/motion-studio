import { BlendMode, EffectType, type EffectNodeId } from "@motion-studio/shared";
import type { IEffectNode } from "./effect-node";

/**
 * Per-channel blend formula, shared between the WGSL and GLSL bodies below
 * (both languages accept the same `a`/`b` vec3 expression syntax for these
 * formulas, so one table generates both — unlike the vertex/fragment
 * pipelines in `packages/rendering`, which never share source).
 * `a` = bottom layer, `b` = top layer, matching `dependencyIds: [bottomId, topId]`.
 */
const BLEND_FORMULAS: Record<BlendMode, string> = {
  [BlendMode.Normal]: "b",
  [BlendMode.Multiply]: "a * b",
  [BlendMode.Screen]: "1.0 - (1.0 - a) * (1.0 - b)",
  [BlendMode.Overlay]: "mix(2.0 * a * b, 1.0 - 2.0 * (1.0 - a) * (1.0 - b), step(0.5, a))",
  [BlendMode.SoftLight]:
    "mix(a - (1.0 - 2.0 * b) * a * (1.0 - a), a + (2.0 * b - 1.0) * (mix(sqrt(a), ((16.0 * a - 12.0) * a + 4.0) * a, step(a, vec3(0.25))) - a), step(0.5, b))",
  [BlendMode.HardLight]: "mix(2.0 * a * b, 1.0 - 2.0 * (1.0 - a) * (1.0 - b), step(0.5, b))",
  [BlendMode.Difference]: "abs(a - b)",
  [BlendMode.Darken]: "min(a, b)",
  [BlendMode.Lighten]: "max(a, b)",
  [BlendMode.ColorDodge]: "min(vec3(1.0), a / max(1.0 - b, vec3(0.0001)))",
  [BlendMode.ColorBurn]: "1.0 - min(vec3(1.0), (1.0 - a) / max(b, vec3(0.0001)))",
};

/**
 * Canvas2D's `globalCompositeOperation` string for a given blend mode — the
 * native fallback for this effect (`filters.md`: CSS filters aren't
 * expressible for two-input blends, but `mix-blend-mode`/composite
 * operations are, and every mode here maps 1:1 to a CSS name).
 */
export function canvasCompositeOperation(mode: BlendMode): GlobalCompositeOperation {
  const map: Record<BlendMode, GlobalCompositeOperation> = {
    [BlendMode.Normal]: "source-over",
    [BlendMode.Multiply]: "multiply",
    [BlendMode.Screen]: "screen",
    [BlendMode.Overlay]: "overlay",
    [BlendMode.SoftLight]: "soft-light",
    [BlendMode.HardLight]: "hard-light",
    [BlendMode.Difference]: "difference",
    [BlendMode.Darken]: "darken",
    [BlendMode.Lighten]: "lighten",
    [BlendMode.ColorDodge]: "color-dodge",
    [BlendMode.ColorBurn]: "color-burn",
  };
  return map[mode];
}

/**
 * Blend-mode compositing node — two inputs (`dependencyIds: [bottomId,
 * topId]`), matching every "Blend" stage in `compositor.md`'s effect chain
 * diagram (`Image → Blur → Shadow → Mask → Blend → Output`). No `cssFilter`:
 * blending isn't a single-input CSS filter function, see
 * `canvasCompositeOperation` for the real Canvas2D fallback instead.
 */
export function createBlendModeNode(
  id: EffectNodeId,
  bottomId: EffectNodeId,
  topId: EffectNodeId,
  mode: BlendMode,
): IEffectNode {
  // Both languages accept the same rgb-vector expression syntax, so the table
  // entry (written in terms of bare `a`/`b`) is rewritten once to reference
  // each side's `.rgb` swizzle and reused for both shader bodies below.
  const blendedExpr = BLEND_FORMULAS[mode].replace(/\ba\b/g, "a.rgb").replace(/\bb\b/g, "b.rgb");

  const wgsl = `
@group(0) @binding(0) var bottomTex: texture_2d<f32>;
@group(0) @binding(1) var bottomSampler: sampler;
@group(1) @binding(0) var topTex: texture_2d<f32>;
@group(1) @binding(1) var topSampler: sampler;

fn effectMain(uv: vec2<f32>) -> vec4<f32> {
  let a = textureSample(bottomTex, bottomSampler, uv);
  let b = textureSample(topTex, topSampler, uv);
  let blended = ${blendedExpr};
  return vec4<f32>(blended, max(a.a, b.a));
}
`.trim();

  const glsl = `#version 300 es
precision mediump float;
uniform sampler2D u_bottomTex;
uniform sampler2D u_topTex;

vec4 effectMain(vec2 uv) {
  vec4 a = texture(u_bottomTex, uv);
  vec4 b = texture(u_topTex, uv);
  vec3 blended = ${blendedExpr};
  return vec4(blended, max(a.a, b.a));
}
`.trim();

  return { id, type: EffectType.BlendMode, dependencyIds: [bottomId, topId], wgsl, glsl };
}
