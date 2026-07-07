import { createEffectNodeId, EffectType, type EffectNodeId } from "@motion-studio/shared";
import type { IEffectNode } from "./effect-node";
import { formatFloat } from "./shader-format";

export interface IGaussianBlurParams {
  readonly radiusPx: number;
  readonly direction: "horizontal" | "vertical";
}

const MAX_TAP_RADIUS = 7; // 15-tap kernel cap — keeps the unrolled loop bounded for shader compilers.

/** Discrete, normalized Gaussian kernel weights for a given pixel radius (sigma = radius / 3). */
export function gaussianKernelWeights(radiusPx: number): number[] {
  if (radiusPx < 0) {
    throw new Error(`gaussianKernelWeights: radiusPx must be >= 0, got ${radiusPx}`);
  }
  const sigma = Math.max(radiusPx / 3, 0.0001);
  const tapRadius = Math.min(Math.max(Math.round(radiusPx), 1), MAX_TAP_RADIUS);
  const raw: number[] = [];
  let sum = 0;
  for (let i = -tapRadius; i <= tapRadius; i++) {
    const w = Math.exp(-(i * i) / (2 * sigma * sigma));
    raw.push(w);
    sum += w;
  }
  return raw.map((w) => w / sum);
}

/**
 * One direction of a separable Gaussian blur (real two-pass technique: run
 * horizontal then vertical — see `createGaussianBlurPair`). Weights are
 * computed once in TS and baked as shader constants, same specialization
 * approach every effect in this package uses instead of a runtime uniform
 * array, since these nodes don't yet have a backend wiring their own
 * uniform buffers (`RenderGraph` integration is still open, see
 * `05-rendering-engine/compositor.md`).
 */
export function createGaussianBlurNode(
  id: EffectNodeId,
  dependencyId: EffectNodeId,
  params: IGaussianBlurParams,
): IEffectNode {
  const weights = gaussianKernelWeights(params.radiusPx);
  const tapRadius = (weights.length - 1) / 2;
  const [dx, dy] = params.direction === "horizontal" ? [1, 0] : [0, 1];

  const wgsl = `
const kTapRadius: i32 = ${tapRadius};
const kWeights = array<f32, ${weights.length}>(${weights.map(formatFloat).join(", ")});
const kDirection = vec2<f32>(${formatFloat(dx)}, ${formatFloat(dy)});

@group(0) @binding(0) var srcTex: texture_2d<f32>;
@group(0) @binding(1) var srcSampler: sampler;

fn effectMain(uv: vec2<f32>, texelSize: vec2<f32>) -> vec4<f32> {
  var color = vec4<f32>(0.0, 0.0, 0.0, 0.0);
  for (var i = -kTapRadius; i <= kTapRadius; i = i + 1) {
    let offset = kDirection * texelSize * f32(i);
    color = color + textureSample(srcTex, srcSampler, uv + offset) * kWeights[i + kTapRadius];
  }
  return color;
}
`.trim();

  const glsl = `#version 300 es
precision mediump float;
const int kTapRadius = ${tapRadius};
const float kWeights[${weights.length}] = float[${weights.length}](${weights.map(formatFloat).join(", ")});
const vec2 kDirection = vec2(${formatFloat(dx)}, ${formatFloat(dy)});

uniform sampler2D u_srcTex;

vec4 effectMain(vec2 uv, vec2 texelSize) {
  vec4 color = vec4(0.0);
  for (int i = -kTapRadius; i <= kTapRadius; i++) {
    vec2 offset = kDirection * texelSize * float(i);
    color += texture(u_srcTex, uv + offset) * kWeights[i + kTapRadius];
  }
  return color;
}
`.trim();

  return {
    id,
    type: EffectType.GaussianBlur,
    dependencyIds: [dependencyId],
    wgsl,
    glsl,
    cssFilter: `blur(${params.radiusPx}px)`,
  };
}

/**
 * Full separable Gaussian blur: horizontal pass feeds the vertical pass.
 * `idPrefix` becomes `${idPrefix}:h` / `${idPrefix}:v`. Chain them in with
 * `orderEffectChain` (or `RenderGraph.addNode` on both, in order) the same
 * as any other two-stage effect.
 */
export function createGaussianBlurPair(
  idPrefix: string,
  dependencyId: EffectNodeId,
  radiusPx: number,
): [IEffectNode, IEffectNode] {
  const horizontal = createGaussianBlurNode(createEffectNodeId(`${idPrefix}:h`), dependencyId, {
    radiusPx,
    direction: "horizontal",
  });
  const vertical = createGaussianBlurNode(createEffectNodeId(`${idPrefix}:v`), horizontal.id, {
    radiusPx,
    direction: "vertical",
  });
  return [horizontal, vertical];
}
