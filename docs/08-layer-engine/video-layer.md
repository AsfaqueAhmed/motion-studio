# Video Layer

> Status: Implemented (Phase 4). Type in `@motion-studio/shared`
> (`layer.ts`), factory in `@motion-studio/layer`
> (`layer-factory.ts#createVideoLayer`).

Video layer type and its properties.

## Shape

```ts
interface IVideoLayer extends ILayerBase {
  type: LayerType.Video;
  assetId: AssetId; // resolved via the Asset Manager (Phase 12), not this engine
  playbackRate: number; // default 1
}
```

## Scope

The Layer Engine only owns the reference (`assetId`) and layer-level
properties (`transform`, `opacity`, `playbackRate`). Decoding, trimming
(in/out points), and where the clip sits in time are Timeline/Asset
concerns — see `../ARCHITECTURE.md` §3 ("Never touches" column).

## Open questions

_None specific to this layer type beyond the shared open items in
`overview.md`._
