import { createEffectNodeId, EffectType, type EffectNodeId } from "@motion-studio/shared";
import { createGaussianBlurPair } from "./blur";
import type { IEffectNode } from "./effect-node";
import { formatFloat } from "./shader-format";

export interface IDropShadowColor {
  readonly r: number;
  readonly g: number;
  readonly b: number;
  readonly a: number;
}

export interface IDropShadowParams {
  readonly offsetXPx: number;
  readonly offsetYPx: number;
  readonly blurRadiusPx: number;
  readonly color: IDropShadowColor;
}

function createSilhouetteNode(
  id: EffectNodeId,
  dependencyId: EffectNodeId,
  offsetXPx: number,
  offsetYPx: number,
  color: IDropShadowColor,
): IEffectNode {
  const [r, g, b, a] = [color.r, color.g, color.b, color.a].map(formatFloat);
  const ox = formatFloat(offsetXPx);
  const oy = formatFloat(offsetYPx);

  const wgsl = `
const kOffset = vec2<f32>(${ox}, ${oy});
const kColor = vec4<f32>(${r}, ${g}, ${b}, ${a});

@group(0) @binding(0) var srcTex: texture_2d<f32>;
@group(0) @binding(1) var srcSampler: sampler;

fn effectMain(uv: vec2<f32>, texelSize: vec2<f32>) -> vec4<f32> {
  let sampleUv = uv - kOffset * texelSize;
  let silhouetteAlpha = textureSample(srcTex, srcSampler, sampleUv).a;
  return vec4<f32>(kColor.rgb, kColor.a * silhouetteAlpha);
}
`.trim();

  const glsl = `#version 300 es
precision mediump float;
const vec2 kOffset = vec2(${ox}, ${oy});
const vec4 kColor = vec4(${r}, ${g}, ${b}, ${a});

uniform sampler2D u_srcTex;

vec4 effectMain(vec2 uv, vec2 texelSize) {
  vec2 sampleUv = uv - kOffset * texelSize;
  float silhouetteAlpha = texture(u_srcTex, sampleUv).a;
  return vec4(kColor.rgb, kColor.a * silhouetteAlpha);
}
`.trim();

  return { id, type: EffectType.DropShadow, dependencyIds: [dependencyId], wgsl, glsl };
}

function createShadowCompositeNode(
  id: EffectNodeId,
  shadowId: EffectNodeId,
  originalId: EffectNodeId,
): IEffectNode {
  const wgsl = `
@group(0) @binding(0) var shadowTex: texture_2d<f32>;
@group(0) @binding(1) var shadowSampler: sampler;
@group(1) @binding(0) var originalTex: texture_2d<f32>;
@group(1) @binding(1) var originalSampler: sampler;

fn effectMain(uv: vec2<f32>) -> vec4<f32> {
  let shadow = textureSample(shadowTex, shadowSampler, uv);
  let original = textureSample(originalTex, originalSampler, uv);
  let outAlpha = original.a + shadow.a * (1.0 - original.a);
  let outRgb = original.rgb * original.a + shadow.rgb * shadow.a * (1.0 - original.a);
  return vec4<f32>(outRgb, outAlpha);
}
`.trim();

  const glsl = `#version 300 es
precision mediump float;
uniform sampler2D u_shadowTex;
uniform sampler2D u_originalTex;

vec4 effectMain(vec2 uv) {
  vec4 shadow = texture(u_shadowTex, uv);
  vec4 original = texture(u_originalTex, uv);
  float outAlpha = original.a + shadow.a * (1.0 - original.a);
  vec3 outRgb = original.rgb * original.a + shadow.rgb * shadow.a * (1.0 - original.a);
  return vec4(outRgb, outAlpha);
}
`.trim();

  return { id, type: EffectType.DropShadow, dependencyIds: [shadowId, originalId], wgsl, glsl };
}

function cssRgba(color: IDropShadowColor): string {
  return `rgba(${Math.round(color.r * 255)}, ${Math.round(color.g * 255)}, ${Math.round(color.b * 255)}, ${color.a})`;
}

/**
 * Full drop-shadow chain: offset silhouette (source alpha, recolored) →
 * separable blur → composite under the original. Last node is the chain's
 * output. `cssFilter` on that output node uses the native CSS/Canvas2D
 * `drop-shadow()` filter function, which already implements this exact
 * offset+blur+colorize+composite-under behavior in one step.
 */
export function createDropShadowChain(
  idPrefix: string,
  sourceId: EffectNodeId,
  params: IDropShadowParams,
): IEffectNode[] {
  const silhouette = createSilhouetteNode(
    createEffectNodeId(`${idPrefix}:silhouette`),
    sourceId,
    params.offsetXPx,
    params.offsetYPx,
    params.color,
  );
  const [blurH, blurV] = createGaussianBlurPair(
    `${idPrefix}:blur`,
    silhouette.id,
    params.blurRadiusPx,
  );
  const composite = createShadowCompositeNode(
    createEffectNodeId(`${idPrefix}:composite`),
    blurV.id,
    sourceId,
  );
  const withCssFilter: IEffectNode = {
    ...composite,
    cssFilter: `drop-shadow(${params.offsetXPx}px ${params.offsetYPx}px ${params.blurRadiusPx}px ${cssRgba(params.color)})`,
  };
  return [silhouette, blurH, blurV, withCssFilter];
}
