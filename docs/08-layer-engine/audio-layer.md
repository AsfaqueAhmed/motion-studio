# Audio Layer

> Status: Implemented (Phase 4). Type in `@motion-studio/shared`
> (`layer.ts`), factory in `@motion-studio/layer`
> (`layer-factory.ts#createAudioLayer`).

Audio layer type and its properties.

## Shape

```ts
interface IAudioLayer extends ILayerBase {
  type: LayerType.Audio;
  assetId: AssetId;
  volume: number; // default 1
}
```

## Scope

The Layer Engine only owns `assetId` and `volume`. Mixing, per-track
fader UI, and sync to the Timeline tick clock are Audio Engine (Phase 9)
concerns — see the audio clock drift risk in `../ARCHITECTURE.md` §6.

## Open questions

_None specific to this layer type beyond the shared open items in
`overview.md`._
