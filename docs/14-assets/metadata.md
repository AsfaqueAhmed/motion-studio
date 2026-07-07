# Metadata

> Status: Implemented (Phase 12, 2026-07-07). See `packages/assets/src/metadata.ts`, `dependency-graph.ts`.

## Per-type metadata schemas (`metadata.ts`)

`IAssetMetadata` is a discriminated union tagged by `AssetType` (added to
`@motion-studio/shared`'s `enums.ts` this phase: `Video | Image | Audio |
Font | LUT`):

| Type    | Fields                                                         |
| ------- | -------------------------------------------------------------- |
| `Video` | `width, height, durationTicks, fps, hasAudio`                  |
| `Image` | `width, height`                                                |
| `Audio` | `durationTicks, sampleRate, numberOfChannels`                  |
| `Font`  | `family`                                                       |
| `LUT`   | `size` (cube edge length, e.g. 33 for a 33×33×33 `.cube` file) |

`IMetadataExtractor.extract(data, type, mimeType)` is a DI interface — no
real container demuxer/decoder is wired in; see `overview.md`'s
"Confirmed technical gaps."

`durationTicks` on `Video`/`Audio` metadata flows straight into
`IAssetCatalogEntry.durationTicks` during import — the catalog doesn't
re-derive it.

## Asset Dependency Graph (`dependency-graph.ts`)

Built on the generic `Hierarchy<TId>` primitive from `@motion-studio/shared`
(ADR-005 #2), not a bespoke structure — `Hierarchy`'s own doc comment
already named this as its second consumer (after the Layer Engine's
Composition Graph) back when it was written in Phase 4. An asset is a
one-level parent; reference ids (opaque strings — in practice a
`TrackItemId`, but this package never imports `@motion-studio/timeline`
to type it that strictly) are its leaves.

`Hierarchy` owns no data itself (by its own design), so `AssetDependencyGraph`
keeps the `Map`s and only calls into `Hierarchy` for the traversal
algorithms (`getDescendants` for "what references this asset,"
`getAncestors` for "what asset does this reference belong to").

**This engine never reaches into Layer/Timeline directly** — per
CLAUDE.md's "one rule," no engine imports another engine's concrete
classes. `registerReference(assetId, referenceId)` /
`unregisterReference(referenceId)` are called by whatever owns the actual
TrackItem/Layer lifecycle — today, only tests; eventually the Editor
Service / command handlers, the same not-yet-built layer that Rendering's
Render Graph and History's `ProjectLoaded` wiring are also waiting on.

## Safe-delete / "unused assets"

`AssetManager.delete(assetId, { force? })` throws if
`dependencyGraph.getReferences(assetId).length > 0` and `force` isn't
set — matching `HistoryEngine.undo()`'s throw-on-invalid-state
convention rather than a softer "returns a warning" API.
`AssetManager.listUnused()` filters the catalog by
`dependencyGraph.isUnused(entry.id)` — "zero incoming references," the
same mechanism ADR-002 specified for both safe-delete and the "unused
assets" view (one mechanism, not two).

## Open questions

- **Reference id shape.** Currently an opaque `string`. If a future
  Editor Service wants stronger typing (e.g. a branded
  `AssetReferenceId`), that's a non-breaking addition to
  `dependency-graph.ts` — nothing else depends on the id being a plain
  string besides `Hierarchy<string>`'s type parameter.
- **Persistence.** `AssetDependencyGraph` is in-memory only; nothing
  currently rebuilds it from the Timeline's actual TrackItems on project
  load. Whoever wires `ProjectLoaded` (still unbuilt, see History's
  equivalent open item) will need to re-walk every Composition's
  TrackItems and call `registerReference` for each one that resolves to
  an asset-backed Layer.
