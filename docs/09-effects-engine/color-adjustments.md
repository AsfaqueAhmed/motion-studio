# Color Adjustments

`color-adjustments.ts`'s `createColorAdjustmentNode(id, dependencyId,
params)` bundles all six adjustments from the original scope — brightness,
contrast, saturation, hue, temperature, tint — into one node/one shader
pass rather than six chained nodes, since they're all cheap per-pixel
matrix math with no need for separate render targets between them.

## Pipeline (applied in this order, inside `effectMain`)

1. **Brightness** — `color *= kBrightness` (1.0 = unchanged).
2. **Contrast** — `(color - 0.5) * kContrast + 0.5` (1.0 = unchanged).
3. **Saturation** — `mix(luma, color, kSaturation)` (0 = grayscale, 1 =
   unchanged), luma via standard `vec3(0.299, 0.587, 0.114)` weights.
4. **Hue rotation** — full YIQ-space rotation (`kHueRadians`), matching how
   browsers implement CSS `hue-rotate()` internally, not a cheap RGB channel
   swap.
5. **Temperature/tint** — simple additive RGB shifts (`temperature` warms
   red / cools blue, `tint` shifts magenta/green), each in `[-1, 1]`. These
   are the two adjustments with **no CSS filter equivalent**.

## Validation

`brightness`, `contrast`, `saturation` must be `>= 0`; `temperature`,
`tint` must be in `[-1, 1]`. `hueDeg` is unconstrained (any rotation is
valid).

## CSS/Canvas2D fallback

`cssFilterFor` composes `brightness() contrast() saturate() hue-rotate()`
**only when `temperature === 0 && tint === 0`** — otherwise it returns
`undefined` rather than emitting a partially-correct filter string, per
`filters.md`'s "no silent approximation" rule. A caller that needs
temperature/tint on a backend with no shader support (Canvas2D without a
software color pass) simply doesn't get this effect on that fallback tier —
documented, not hidden.

## Open questions

- None outstanding — six adjustments requested, six implemented, with an
  explicit (not silent) gap on the CSS fallback for the two that have no
  native filter.
