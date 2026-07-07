import { EffectType, type EffectNodeId } from "@motion-studio/shared";
import type { IEffectNode } from "./effect-node";
import { formatFloat } from "./shader-format";

export interface IColorAdjustmentParams {
  /** 1.0 = unchanged, matching CSS `brightness()`/`contrast()`/`saturate()` conventions. */
  readonly brightness: number;
  readonly contrast: number;
  readonly saturation: number;
  readonly hueDeg: number;
  /** -1..1, warm(+)/cool(-) shift. No CSS filter equivalent — GPU/software-only. */
  readonly temperature: number;
  /** -1..1, magenta(+)/green(-) shift. No CSS filter equivalent — GPU/software-only. */
  readonly tint: number;
}

const LUMA_WEIGHTS = "vec3(0.299, 0.587, 0.114)";

function validate(params: IColorAdjustmentParams): void {
  if (params.brightness < 0) throw new Error("color adjustment: brightness must be >= 0");
  if (params.contrast < 0) throw new Error("color adjustment: contrast must be >= 0");
  if (params.saturation < 0) throw new Error("color adjustment: saturation must be >= 0");
  if (params.temperature < -1 || params.temperature > 1) {
    throw new Error("color adjustment: temperature must be in [-1, 1]");
  }
  if (params.tint < -1 || params.tint > 1) {
    throw new Error("color adjustment: tint must be in [-1, 1]");
  }
}

function cssFilterFor(params: IColorAdjustmentParams): string | undefined {
  // temperature/tint have no CSS filter equivalent — fall back to undefined
  // (no partial CSS filter) whenever either is non-zero, per filters.md.
  if (params.temperature !== 0 || params.tint !== 0) {
    return undefined;
  }
  return (
    `brightness(${params.brightness}) contrast(${params.contrast}) ` +
    `saturate(${params.saturation}) hue-rotate(${params.hueDeg}deg)`
  );
}

/** Brightness/contrast/saturation/hue/temperature/tint in one node, per `color-adjustments.md`. */
export function createColorAdjustmentNode(
  id: EffectNodeId,
  dependencyId: EffectNodeId,
  params: IColorAdjustmentParams,
): IEffectNode {
  validate(params);
  const hueRadians = (params.hueDeg * Math.PI) / 180;

  const wgsl = `
const kBrightness: f32 = ${formatFloat(params.brightness)};
const kContrast: f32 = ${formatFloat(params.contrast)};
const kSaturation: f32 = ${formatFloat(params.saturation)};
const kHueRadians: f32 = ${formatFloat(hueRadians)};
const kTemperature: f32 = ${formatFloat(params.temperature)};
const kTint: f32 = ${formatFloat(params.tint)};

@group(0) @binding(0) var srcTex: texture_2d<f32>;
@group(0) @binding(1) var srcSampler: sampler;

fn effectMain(uv: vec2<f32>) -> vec4<f32> {
  let src = textureSample(srcTex, srcSampler, uv);
  var color = src.rgb;
  color = color * kBrightness;
  color = (color - vec3<f32>(0.5)) * kContrast + vec3<f32>(0.5);
  let luma = dot(color, ${LUMA_WEIGHTS});
  color = mix(vec3<f32>(luma), color, kSaturation);
  let cosHue = cos(kHueRadians);
  let sinHue = sin(kHueRadians);
  let yiqY = dot(color, vec3<f32>(0.299, 0.587, 0.114));
  let yiqI = dot(color, vec3<f32>(0.596, -0.274, -0.322));
  let yiqQ = dot(color, vec3<f32>(0.211, -0.523, 0.312));
  let rotatedI = yiqI * cosHue - yiqQ * sinHue;
  let rotatedQ = yiqI * sinHue + yiqQ * cosHue;
  color = vec3<f32>(
    yiqY + 0.956 * rotatedI + 0.621 * rotatedQ,
    yiqY - 0.272 * rotatedI - 0.647 * rotatedQ,
    yiqY - 1.106 * rotatedI + 1.703 * rotatedQ,
  );
  color = color + vec3<f32>(kTemperature * 0.1, 0.0, -kTemperature * 0.1);
  color = color + vec3<f32>(kTint * 0.1, -kTint * 0.05, kTint * 0.1);
  return vec4<f32>(clamp(color, vec3<f32>(0.0), vec3<f32>(1.0)), src.a);
}
`.trim();

  const glsl = `#version 300 es
precision mediump float;
const float kBrightness = ${formatFloat(params.brightness)};
const float kContrast = ${formatFloat(params.contrast)};
const float kSaturation = ${formatFloat(params.saturation)};
const float kHueRadians = ${formatFloat(hueRadians)};
const float kTemperature = ${formatFloat(params.temperature)};
const float kTint = ${formatFloat(params.tint)};

uniform sampler2D u_srcTex;

vec4 effectMain(vec2 uv) {
  vec4 src = texture(u_srcTex, uv);
  vec3 color = src.rgb;
  color = color * kBrightness;
  color = (color - vec3(0.5)) * kContrast + vec3(0.5);
  float luma = dot(color, ${LUMA_WEIGHTS});
  color = mix(vec3(luma), color, kSaturation);
  float cosHue = cos(kHueRadians);
  float sinHue = sin(kHueRadians);
  float yiqY = dot(color, vec3(0.299, 0.587, 0.114));
  float yiqI = dot(color, vec3(0.596, -0.274, -0.322));
  float yiqQ = dot(color, vec3(0.211, -0.523, 0.312));
  float rotatedI = yiqI * cosHue - yiqQ * sinHue;
  float rotatedQ = yiqI * sinHue + yiqQ * cosHue;
  color = vec3(
    yiqY + 0.956 * rotatedI + 0.621 * rotatedQ,
    yiqY - 0.272 * rotatedI - 0.647 * rotatedQ,
    yiqY - 1.106 * rotatedI + 1.703 * rotatedQ
  );
  color = color + vec3(kTemperature * 0.1, 0.0, -kTemperature * 0.1);
  color = color + vec3(kTint * 0.1, -kTint * 0.05, kTint * 0.1);
  return vec4(clamp(color, 0.0, 1.0), src.a);
}
`.trim();

  const cssFilter = cssFilterFor(params);
  return {
    id,
    type: EffectType.ColorAdjustment,
    dependencyIds: [dependencyId],
    wgsl,
    glsl,
    ...(cssFilter !== undefined ? { cssFilter } : {}),
  };
}
