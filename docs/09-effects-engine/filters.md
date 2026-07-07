# Filters (CSS/Canvas2D fallback path)

This doc originally scoped "color/noise/distortion filter nodes" generically;
what actually landed is the **CSS-filter fallback mechanism** the Phase 8
checklist calls for ("CSS filters as Canvas2D fallback for effects") — not a
new filter effect type. Color/noise/distortion as GPU-only effect nodes
beyond what `blur.ts`/`color-adjustments.ts` already cover are not
implemented; nothing in the current Phase 8 scope asked for a general noise
or distortion node.

## `css-filter-chain.ts`

`composeCssFilterChain(nodes: readonly IEffectNode[])` takes an
already-ordered (dependency-first) effect chain and returns:

```ts
interface ICssFilterChainResult {
  readonly filter: string; // e.g. "blur(4px) brightness(1.2)"
  readonly unsupportedIds: readonly EffectNodeId[];
}
```

Nodes are joined in order (CSS filter functions apply left-to-right, same
as the chain's dependency order) using each node's own `cssFilter` field.
Nodes without one — `BlendMode`, `Transition`, and `ColorAdjustment` with
non-zero temperature/tint — are **skipped and reported**, not silently
dropped, so a caller can decide whether the resulting partial approximation
is acceptable for the current backend tier, or whether it needs to fall
back further still (to `RenderBackend.Software`, which has no CSS
dependency at all).

## Which effects have a real (lossless) CSS fallback

| Effect                          | CSS fallback                                                    | Lossless? |
| ------------------------------- | --------------------------------------------------------------- | --------- |
| Gaussian Blur                   | `blur(Npx)`                                                     | Yes       |
| Drop Shadow                     | `drop-shadow(x y blur color)`                                   | Yes       |
| Color Adjustment (no temp/tint) | `brightness() contrast() saturate() hue-rotate()`               | Yes       |
| Color Adjustment (temp/tint)    | none                                                            | n/a       |
| Blend Mode                      | `globalCompositeOperation` (not a filter, see `blend-modes.md`) | Yes       |
| Glow                            | none (see `glow.md` for the `drop-shadow` approximation)        | n/a       |
| Transition                      | none (needs two draw calls, see `transitions.md`)               | n/a       |

## Open questions

- No noise or distortion effect node exists — flagged as descoped rather
  than silently absent, since the original stub's title implied it.
