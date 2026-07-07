import { EffectType, TransitionType, type EffectNodeId } from "@motion-studio/shared";
import type { IEffectNode } from "./effect-node";
import { formatFloat } from "./shader-format";

function wipeCondition(type: TransitionType): string {
  switch (type) {
    case TransitionType.WipeLeft:
      return "uv.x > 1.0 - kProgress";
    case TransitionType.WipeRight:
      return "uv.x < kProgress";
    case TransitionType.WipeUp:
      return "uv.y > 1.0 - kProgress";
    case TransitionType.WipeDown:
      return "uv.y < kProgress";
    case TransitionType.CrossDissolve:
      throw new Error("wipeCondition: CrossDissolve has no spatial wipe condition");
  }
}

/**
 * Transition between two clips at a track boundary — two inputs
 * (`dependencyIds: [fromId, toId]`), driven by `progress` (0 = fully
 * `from`, 1 = fully `to`). Timeline owns *when* a transition is active
 * (the overlap region between two TrackItems) and computes `progress` for
 * the current tick; Effects only owns *how* to blend the two frames — it
 * never reads Timeline state directly (CLAUDE.md engine ownership).
 *
 * No `cssFilter`: a transition needs two source images composited, which a
 * single-input CSS filter chain can't express. `CrossDissolve` still has a
 * simple Canvas2D fallback (draw `to` over `from` with `globalAlpha =
 * progress`), left to the caller since it needs two draw calls, not a node.
 */
export function createTransitionNode(
  id: EffectNodeId,
  fromId: EffectNodeId,
  toId: EffectNodeId,
  type: TransitionType,
  progress: number,
): IEffectNode {
  if (progress < 0 || progress > 1) {
    throw new Error(`createTransitionNode: progress must be in [0, 1], got ${progress}`);
  }
  const p = formatFloat(progress);

  const body =
    type === TransitionType.CrossDissolve
      ? { wgsl: "mix(fromColor, toColor, kProgress)", glsl: "mix(fromColor, toColor, kProgress)" }
      : {
          wgsl: `select(fromColor, toColor, ${wipeCondition(type)})`,
          glsl: `(${wipeCondition(type)}) ? toColor : fromColor`,
        };

  const wgsl = `
const kProgress: f32 = ${p};

@group(0) @binding(0) var fromTex: texture_2d<f32>;
@group(0) @binding(1) var fromSampler: sampler;
@group(1) @binding(0) var toTex: texture_2d<f32>;
@group(1) @binding(1) var toSampler: sampler;

fn effectMain(uv: vec2<f32>) -> vec4<f32> {
  let fromColor = textureSample(fromTex, fromSampler, uv);
  let toColor = textureSample(toTex, toSampler, uv);
  return ${body.wgsl};
}
`.trim();

  const glsl = `#version 300 es
precision mediump float;
const float kProgress = ${p};

uniform sampler2D u_fromTex;
uniform sampler2D u_toTex;

vec4 effectMain(vec2 uv) {
  vec4 fromColor = texture(u_fromTex, uv);
  vec4 toColor = texture(u_toTex, uv);
  return ${body.glsl};
}
`.trim();

  return { id, type: EffectType.Transition, dependencyIds: [fromId, toId], wgsl, glsl };
}
