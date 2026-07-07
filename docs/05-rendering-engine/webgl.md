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

## Open questions

- Same real-GPU-verification gap as `webgpu.md` — the fake context always
  "succeeds" at compile/link, so this only proves the call sequence, not
  that the GLSL itself compiles on a real driver.
- No texture/sampler support yet — there's nothing to sample until real
  pixel content (decoded video, rasterized text) exists (Phases 8/9/12).
