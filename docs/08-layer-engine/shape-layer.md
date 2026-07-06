# Shape Layer

> Status: Implemented (Phase 4). Type in `@motion-studio/shared`
> (`layer.ts`), factory in `@motion-studio/layer`
> (`layer-factory.ts#createShapeLayer`).

Shape layer type: rectangle, circle, ellipse, polygon, star, bezier path.

## Shape (current)

```ts
interface IShapeLayer extends ILayerBase {
  type: LayerType.Shape;
  shape: "rectangle" | "ellipse" | "polygon" | "star" | "path"; // default "rectangle"
  fillColor: string; // default "#FFFFFF"
  strokeColor: string; // default "transparent"
  strokeWidth: number; // default 0
  cornerRadius: number; // default 0
}
```

Note: `cornerRadius` is a fixed field on every shape variant even though
it's only meaningful for `"rectangle"`. Kept flat rather than a
discriminated union per shape kind because no consumer (Rendering,
Inspector) exists yet to justify the extra complexity — revisit if a
shape kind needs mutually exclusive fields.

## Open questions

- Polygon/star point counts and the bezier `path` data format aren't
  modeled yet — no field carries them. Needs a decision once the Pen/Shape
  tool (Phase 15, `17-ui/toolbar.md`) or Rendering's path fill (Phase 7)
  is implemented.
