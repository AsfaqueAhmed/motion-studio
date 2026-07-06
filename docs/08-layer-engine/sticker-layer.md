# Sticker Layer

> Status: Implemented (Phase 4, alongside the other five layer types).
> Type in `@motion-studio/shared` (`layer.ts`), factory in
> `@motion-studio/layer` (`layer-factory.ts#createStickerLayer`).

Sticker layer type.

## Shape

```ts
interface IStickerLayer extends ILayerBase {
  type: LayerType.Sticker;
  assetId: AssetId;
}
```

## Scope

Note: PLAN.md's Phase 4 checklist (4.2) only names Video, Text, Image,
Shape, Audio, and Group explicitly, but `LayerType.Sticker` and
`IStickerLayer` already existed in `@motion-studio/shared` from Phase 1
scaffolding and `ILayer`'s discriminated union requires every engine
consumer (registry, composition graph) to handle all seven variants
regardless — so a factory was added for consistency rather than leaving
this one type uncreatable. No sticker-specific behavior (e.g. animated
GIF/WebP playback) is implemented beyond the plain asset reference.

## Open questions

_None beyond the shared open items in `overview.md`._
