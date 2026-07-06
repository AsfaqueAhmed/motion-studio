# Image Layer

> Status: Implemented (Phase 4). Type in `@motion-studio/shared`
> (`layer.ts`), factory in `@motion-studio/layer`
> (`layer-factory.ts#createImageLayer`).

Image layer type and its properties.

## Shape

```ts
interface IImageLayer extends ILayerBase {
  type: LayerType.Image;
  assetId: AssetId;
  fitMode: "contain" | "cover" | "fill" | "none"; // default "contain"
}
```

## Scope

Same asset-reference pattern as `video-layer.md` — the Layer Engine only
owns `assetId` and `fitMode`; decoding and caching are Asset Manager
(Phase 12) concerns.

## Open questions

_None specific to this layer type beyond the shared open items in
`overview.md`._
