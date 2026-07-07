# Drop Shadow

`shadow.ts`'s `createDropShadowChain(idPrefix, sourceId, { offsetXPx,
offsetYPx, blurRadiusPx, color })` is a four-node chain:

```
source ──► silhouette ──► blur:h ──► blur:v ──┐
   └──────────────────────────────────────────► composite (output)
```

1. **Silhouette** (`createSilhouetteNode`): samples the source's alpha
   channel at `uv - offset` and recolors it with `color` — this produces an
   offset, colorized "shadow shape" with no RGB content of its own yet.
2. **Blur** — same `createGaussianBlurPair` reuse as `glow.ts`.
3. **Composite** (`createShadowCompositeNode`): standard source-over
   compositing with the _blurred shadow_ underneath the _original_ source —
   `outAlpha = original.a + shadow.a * (1 - original.a)`, `outRgb =
original.rgb * original.a + shadow.rgb * shadow.a * (1 - original.a)`.
   Two inputs: `dependencyIds: [shadowId, originalId]`.

`IDropShadowColor` is a plain `{ r, g, b, a }` in `[0, 1]` per channel
(matching WGSL/GLSL color conventions, not `0-255`).

## CSS/Canvas2D fallback

The composite (output) node's `cssFilter` is set to the native
`drop-shadow(${x}px ${y}px ${blur}px rgba(...))` filter function — CSS's
`drop-shadow` already implements this exact offset → blur → colorize →
composite-under pipeline in one native step, so (unlike Glow) this fallback
has no quality loss versus the GPU path.

## Open questions

- Same render-target/multi-pass execution gap as `blur.md`.
- No spread (shadow size independent of blur radius) — only offset + blur,
  matching CSS `drop-shadow()`'s own parameter set (which also has no
  spread, unlike `box-shadow`). Not in the Phase 8 checklist; flagged here
  in case a future design wants `box-shadow`-style spread.
