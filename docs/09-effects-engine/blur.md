# Blur

`blur.ts` implements a real separable Gaussian blur, not a single-pass
approximation. `createGaussianBlurNode(id, dependencyId, { radiusPx,
direction })` generates one direction of the pass; `createGaussianBlurPair`
chains horizontal into vertical (`${idPrefix}:h` → `${idPrefix}:v`) since a
correct 2D Gaussian is always two 1D passes, not one.

## Kernel

`gaussianKernelWeights(radiusPx)` computes a normalized, symmetric discrete
kernel with `sigma = radiusPx / 3`, capped at a 15-tap window
(`MAX_TAP_RADIUS = 7`) to keep the unrolled shader loop bounded. Weights are
computed once in TypeScript and baked into the shader source as `const`
arrays (`array<f32, N>` in WGSL, `float[N]` in GLSL) — see `overview.md` for
why baking beats a runtime uniform today.

## Shader shape

Both shaders expect a `srcTex`/`srcSampler` (WGSL) or `u_srcTex` (GLSL)
binding and an `effectMain(uv, texelSize)` entry point that samples `2 *
tapRadius + 1` times along `kDirection` (`vec2(1,0)` horizontal, `vec2(0,1)`
vertical) and returns the weighted sum. `texelSize` (1/width, 1/height) is
left as a caller-supplied parameter rather than baked in, since it depends
on the render target size, not the blur itself.

## CSS/Canvas2D fallback

`cssFilter: "blur(${radiusPx}px)"` — this is an exact match to the native
CSS `blur()` filter function, not an approximation, so the Canvas2D/CSS path
for blur alone has zero quality loss versus the GPU path.

## Open questions

- No render-target ping-pong exists yet to actually execute the horizontal
  pass into an intermediate texture and feed it to the vertical pass — see
  `overview.md`'s "Texture/render-target management" open question.
