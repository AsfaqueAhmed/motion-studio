# Blend Modes

`BlendMode` (`@motion-studio/shared`): Normal, Multiply, Screen, Overlay,
SoftLight, HardLight, Difference, Darken, Lighten, ColorDodge, ColorBurn —
the full original list, all implemented.

`blend-modes.ts`'s `createBlendModeNode(id, bottomId, topId, mode)` is a
**two-input** node — `dependencyIds: [bottomId, topId]` — matching the
"Blend" stage in the Render Graph's effect chain diagram (`Image → Blur →
Shadow → Mask → Blend → Output`, see `05-rendering-engine/compositor.md`).
Output alpha is `max(bottom.a, top.a)`; only RGB is blended per-mode.

## Formula table

Every mode's per-channel formula lives in one `BLEND_FORMULAS` table
(`a` = bottom, `b` = top), written once and reused for both WGSL and GLSL
bodies — the two languages accept identical `vec3` expression syntax for
these formulas, so (unlike every other effect in this package) this is the
one place shader source is genuinely shared rather than authored twice. The
formulas are the standard ones (screen = `1-(1-a)(1-b)`, overlay =
hard-light with operands swapped, soft-light using the W3C
compositing-and-blending spec's continuous approximation, color-dodge/burn
clamped to avoid divide-by-zero via `max(x, 0.0001)`).

## CSS/Canvas2D fallback

No `cssFilter` — blending two images isn't expressible as a single-input
CSS filter function. Instead, `canvasCompositeOperation(mode)` maps each
`BlendMode` to its native Canvas2D `globalCompositeOperation` string
(`"multiply"`, `"screen"`, `"soft-light"`, etc. — CSS `mix-blend-mode` names
1:1, `Normal` → `"source-over"`). This is a real, lossless fallback: Canvas2D
implements these compositing modes natively, so no shader is needed at all
on that path.

## Open questions

- None outstanding for this effect specifically — the formula table and
  both fallback paths are complete per `filters.md`'s scope.
