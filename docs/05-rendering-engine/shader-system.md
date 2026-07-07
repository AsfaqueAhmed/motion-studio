# Shader System

Shader authoring: effects must be implemented once per backend (WGSL + GLSL).

## First real example: the placeholder-fill "effect"

Every backend today implements exactly one "effect" — flat, alpha-blended
color fill — authored three times (once per backend, as predicted):

| Backend  | Source                                   | Location                                     |
| -------- | ---------------------------------------- | -------------------------------------------- |
| WebGPU   | WGSL (`vs_main`/`fs_main`)               | `packages/rendering/src/webgpu-backend.ts`   |
| WebGL2   | GLSL `#version 300 es`                   | `packages/rendering/src/webgl2-backend.ts`   |
| Canvas2D | Canvas 2D API calls (no shader language) | `packages/rendering/src/canvas2d-backend.ts` |
| Software | Plain JS per-pixel blend                 | `packages/rendering/src/software-backend.ts` |

The WGSL and GLSL versions were kept in lockstep deliberately: same
uniform names conceptually (`u_translate`/`translate`, `u_boundsOrigin`/
`boundsOrigin`, etc.), same math order (bounds → scale → rotate →
translate → clip space). This doesn't reduce the "author twice" cost, but
it makes the two implementations easy to diff against each other when a
real effect (blur, glow, ...) is added in Phase 8 and needs the same
treatment.

## Open questions

- No shared shader-authoring DSL or code-gen exists to reduce the
  WGSL/GLSL duplication cost — Phase 8 (Effects Engine) will be the first
  real stress test of "author once per backend" once there's more than one
  effect.
- Canvas2D and Software have no shader concept at all (they call
  imperative drawing APIs / write pixels directly) — any future
  effect that Canvas2D/Software need to support (e.g. a Gaussian blur) has
  to be implemented as its own algorithm per backend, not just "a third
  shader."
