# Glow

`glow.ts`'s `createGlowChain(idPrefix, sourceId, { thresholdLevel,
intensity, radiusPx })` is a four-node chain, not a single effect node —
glow is inherently multi-stage (bright-pass extract → blur → additive
composite):

```
source ──► bright-pass ──► blur:h ──► blur:v ──┐
   └──────────────────────────────────────────► composite (output)
```

1. **Bright-pass** (`createBrightPassNode`): masks out everything below
   `thresholdLevel` luma using `smoothstep(threshold, threshold + 0.1,
luma)` (a soft edge, not a hard cutoff, to avoid banding).
2. **Blur** — reuses `createGaussianBlurPair` from `blur.ts` unchanged; glow
   doesn't reimplement blurring.
3. **Composite** (`createGlowCompositeNode`): additively blends the
   blurred bright-pass (scaled by `intensity`) back onto the _original_
   source (not the bright-pass) — two texture inputs, hence
   `dependencyIds: [sourceId, blurV.id]` on the output node.

## Validation

`thresholdLevel` must be in `[0, 1]`; `intensity` must be `>= 0`. Both throw
synchronously in the factory (validation lives at construction time, not
deferred to shader compilation).

## CSS/Canvas2D fallback

None. There is no native CSS "glow" filter. A caller wanting a Canvas2D
approximation should compose `drop-shadow(0 0 <radius>px <color>)` instead
(zero offset turns a drop shadow into an even outward glow) — that's a
`shadow.ts` construct, not this chain, so `createGlowChain`'s output node
deliberately has no `cssFilter`.

## Open questions

- Same render-target/multi-pass execution gap as `blur.md`.
