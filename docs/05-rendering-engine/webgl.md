# WebGL

Fallback backend. GLSL shaders -- NOT auto-shared with WGSL; each effect authored twice.

## Implementation (`packages/rendering/src/webgl2-backend.ts`)

`WebGL2RenderBackend implements IRenderBackend`. `IWebGL2Context` is a
hand-rolled minimal interface (not the full lib.dom `WebGL2RenderingContext`)
so tests can inject a fake (`test-support/fake-webgl2-context.ts`) instead
of a real GPU. GL constants (`VERTEX_SHADER`, `COMPILE_STATUS`, ...) are
read off the context itself — exactly how real WebGL2 code does it
(`gl.createShader(gl.VERTEX_SHADER)`) — so a real `WebGL2RenderingContext`
satisfies the interface structurally without any adaptation.

**Pipeline shape:** identical topology to the WebGPU backend —
`VERTEX_SHADER_SOURCE`/`FRAGMENT_SHADER_SOURCE` (`#version 300 es`), one
unit-quad vertex buffer drawn as `TRIANGLE_STRIP`, per-node uniforms
(`u_translate`, `u_scale`, `u_rotation`, `u_boundsOrigin`, `u_boundsSize`,
`u_color`) set via `uniform2f`/`uniform4f` before each `drawArrays` call —
immediate-mode uniforms instead of WebGPU's uniform-buffer-rewrite, since
that's how WebGL2 actually works.

Shader compile/link failures throw with the driver's info log
(`getShaderInfoLog`/`getProgramInfoLog`) rather than failing silently.

## Textured pipeline

A second program (`VERTEX_SHADER_SOURCE_TEXTURED`/
`FRAGMENT_SHADER_SOURCE_TEXTURED`) samples a real `sampler2D` instead of a
flat `u_color`; its vertex shader derives `v_uv` directly from the unit
quad (`vec2(a_unitQuad.x, 1.0 - a_unitQuad.y)`, Y-flipped for the top-left
vs. bottom-left origin mismatch) so no second vertex buffer is needed —
both programs share the same `layout(location = 0)` attribute binding, set
up once per frame regardless of which program a given node ends up using.
`drawNode` picks flat vs. textured per node based on whether
`node.texture?.kind === "image-source"`.

Textures are cached per `assetId` in a private `Map`, created + uploaded
via `texImage2D` on first sight. Static images upload once; a live
`HTMLVideoElement` source (`ITextureSource.isLive`) re-uploads every
`drawFrame` call, since the browser advances its decoded frame between
draws independently of anything this backend does.

## Open questions

- Same real-GPU-verification gap as `webgpu.md` — the fake context always
  "succeeds" at compile/link, so this only proves the call sequence, not
  that the GLSL itself compiles on a real driver.
- No texture support for Text/Shape/Group layers — there's nothing to
  sample until those layers get their own rasterization/tessellation
  pipeline (still not built; Image/Video/Sticker/Audio layers are covered).
