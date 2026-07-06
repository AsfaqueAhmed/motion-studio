# Text Layer

> Status: Implemented (Phase 4). Type in `@motion-studio/shared`
> (`layer.ts`), factory in `@motion-studio/layer`
> (`layer-factory.ts#createTextLayer`).

Text layer type: font, kerning, letter spacing, line height, stroke, shadow, gradient.

## Shape (current)

```ts
interface ITextLayer extends ILayerBase {
  type: LayerType.Text;
  content: string;
  fontFamily: string; // default "Inter"
  fontSize: number; // default 48
  color: string; // default "#FFFFFF"
  textAlign: "left" | "center" | "right"; // default "left"
}
```

## Scope

Phase 4 implements exactly the fields above — the richer typography set
named in this doc's title (kerning, letter spacing, line height, stroke,
shadow, gradient) is **not yet in `ILayerBase`/`ITextLayer`**. Adding them
was deliberately deferred rather than speculatively widening the shared
type: none of Rendering (Phase 7, text layout/shaping), Effects (Phase 8,
stroke/shadow as effect nodes vs. layer properties), or the Inspector
(Phase 15, which editor per field) exist yet to consume them, and
`PropertySchemaRegistry`/`AnimatablePropertyRegistry` (Phase 6/15) are the
natural place to register each new property as it's actually needed.

## Open questions

- Where do stroke/shadow/gradient live — as `ITextLayer` fields, or as
  Effects Engine nodes applied to any layer type (not just Text)? Needs a
  decision before Phase 8/9 implementation; leaning toward the latter
  since blur/glow/shadow are already modeled as generic effect nodes in
  `../09-effects-engine/`.
