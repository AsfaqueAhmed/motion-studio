import { createEffectNodeId, EffectType, type EffectNodeId } from "@motion-studio/shared";
import { createGaussianBlurPair } from "./blur";
import type { IEffectNode } from "./effect-node";
import { formatFloat } from "./shader-format";

export interface IGlowParams {
  /** Luma threshold (0..1) above which a pixel contributes to the glow. */
  readonly thresholdLevel: number;
  /** Additive intensity multiplier for the blurred bright-pass. */
  readonly intensity: number;
  readonly radiusPx: number;
}

function createBrightPassNode(
  id: EffectNodeId,
  dependencyId: EffectNodeId,
  thresholdLevel: number,
): IEffectNode {
  if (thresholdLevel < 0 || thresholdLevel > 1) {
    throw new Error(
      `createBrightPassNode: thresholdLevel must be in [0, 1], got ${thresholdLevel}`,
    );
  }
  const t = formatFloat(thresholdLevel);

  const wgsl = `
const kThreshold: f32 = ${t};
const kLumaWeights = vec3<f32>(0.299, 0.587, 0.114);

@group(0) @binding(0) var srcTex: texture_2d<f32>;
@group(0) @binding(1) var srcSampler: sampler;

fn effectMain(uv: vec2<f32>) -> vec4<f32> {
  let color = textureSample(srcTex, srcSampler, uv);
  let luma = dot(color.rgb, kLumaWeights);
  let mask = smoothstep(kThreshold, kThreshold + 0.1, luma);
  return vec4<f32>(color.rgb * mask, color.a * mask);
}
`.trim();

  const glsl = `#version 300 es
precision mediump float;
const float kThreshold = ${t};
const vec3 kLumaWeights = vec3(0.299, 0.587, 0.114);

uniform sampler2D u_srcTex;

vec4 effectMain(vec2 uv) {
  vec4 color = texture(u_srcTex, uv);
  float luma = dot(color.rgb, kLumaWeights);
  float mask = smoothstep(kThreshold, kThreshold + 0.1, luma);
  return vec4(color.rgb * mask, color.a * mask);
}
`.trim();

  return { id, type: EffectType.Glow, dependencyIds: [dependencyId], wgsl, glsl };
}

function createGlowCompositeNode(
  id: EffectNodeId,
  originalId: EffectNodeId,
  blurredBrightId: EffectNodeId,
  intensity: number,
): IEffectNode {
  if (intensity < 0) {
    throw new Error(`createGlowCompositeNode: intensity must be >= 0, got ${intensity}`);
  }
  const k = formatFloat(intensity);

  const wgsl = `
const kIntensity: f32 = ${k};

@group(0) @binding(0) var originalTex: texture_2d<f32>;
@group(0) @binding(1) var originalSampler: sampler;
@group(1) @binding(0) var glowTex: texture_2d<f32>;
@group(1) @binding(1) var glowSampler: sampler;

fn effectMain(uv: vec2<f32>) -> vec4<f32> {
  let original = textureSample(originalTex, originalSampler, uv);
  let glow = textureSample(glowTex, glowSampler, uv) * kIntensity;
  return vec4<f32>(original.rgb + glow.rgb, clamp(original.a + glow.a, 0.0, 1.0));
}
`.trim();

  const glsl = `#version 300 es
precision mediump float;
const float kIntensity = ${k};

uniform sampler2D u_originalTex;
uniform sampler2D u_glowTex;

vec4 effectMain(vec2 uv) {
  vec4 original = texture(u_originalTex, uv);
  vec4 glow = texture(u_glowTex, uv) * kIntensity;
  return vec4(original.rgb + glow.rgb, clamp(original.a + glow.a, 0.0, 1.0));
}
`.trim();

  return { id, type: EffectType.Glow, dependencyIds: [originalId, blurredBrightId], wgsl, glsl };
}

/**
 * Full glow chain: bright-pass extraction → separable blur → additive
 * composite back onto the original. Four nodes, in dependency order —
 * `nodes[nodes.length - 1]` is the chain's single output. There is no
 * native CSS filter for "glow"; callers wanting a Canvas2D approximation
 * should use `drop-shadow(0 0 <radius>px <color>)` instead (see `shadow.ts`),
 * which is why no node in this chain sets `cssFilter`.
 */
export function createGlowChain(
  idPrefix: string,
  sourceId: EffectNodeId,
  params: IGlowParams,
): IEffectNode[] {
  const brightPass = createBrightPassNode(
    createEffectNodeId(`${idPrefix}:bright-pass`),
    sourceId,
    params.thresholdLevel,
  );
  const [blurH, blurV] = createGaussianBlurPair(`${idPrefix}:blur`, brightPass.id, params.radiusPx);
  const composite = createGlowCompositeNode(
    createEffectNodeId(`${idPrefix}:composite`),
    sourceId,
    blurV.id,
    params.intensity,
  );
  return [brightPass, blurH, blurV, composite];
}
