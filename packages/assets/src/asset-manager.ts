import type { AssetId, IAssetsEngine, Tick } from "@motion-studio/shared";
import { toTick } from "@motion-studio/shared";
import type { AssetCatalog, IAssetCatalogEntry } from "./asset-catalog";
import { AssetDependencyGraph } from "./dependency-graph";
import { importAsset, type IAssetEventSink, type IAssetImportInput } from "./import-pipeline";
import type { IAssetBlobStore, IThumbnailStore, IWaveformStore } from "./asset-storage";
import type { IMetadataExtractor } from "./metadata";
import type { IThumbnailGenerator } from "./thumbnail-generator";
import type { IWaveformGenerator } from "./waveform-generator";

export interface IAssetManagerOptions {
  readonly blobStore: IAssetBlobStore;
  readonly catalog: AssetCatalog;
  readonly metadataExtractor: IMetadataExtractor;
  readonly thumbnailGenerator?: IThumbnailGenerator;
  readonly thumbnailStore?: IThumbnailStore;
  readonly waveformGenerator?: IWaveformGenerator;
  readonly waveformStore?: IWaveformStore;
  readonly events?: IAssetEventSink;
  readonly dependencyGraph?: AssetDependencyGraph;
}

/**
 * "Single source of truth for all assets" (PLAN.md Phase 12). Thin
 * `IEngine` facade tying the import pipeline, catalog, and dependency
 * graph together — matching `ExportEngine`/`HistoryEngine`'s split
 * (engine class owns lifecycle + cross-cutting bookkeeping, standalone
 * functions/classes own the actual logic). See docs/14-assets/overview.md.
 */
export class AssetManager implements IAssetsEngine {
  readonly name = "Assets";

  private readonly dependencyGraph: AssetDependencyGraph;

  constructor(private readonly options: IAssetManagerOptions) {
    this.dependencyGraph = options.dependencyGraph ?? new AssetDependencyGraph();
  }

  initialize(): void {}

  ready(): void {}

  dispose(): void {}

  import(input: IAssetImportInput): Promise<IAssetCatalogEntry> {
    return importAsset(input, this.options);
  }

  get(assetId: AssetId): Promise<IAssetCatalogEntry | undefined> {
    return this.options.catalog.get(assetId);
  }

  list(): Promise<IAssetCatalogEntry[]> {
    return this.options.catalog.list();
  }

  /** The one representative thumbnail the import pipeline generates, stored at `toTick(0)` (see docs/14-assets/thumbnails.md). */
  getThumbnail(assetId: AssetId, atTick: Tick = toTick(0)): Promise<Uint8Array | undefined> {
    return this.options.thumbnailStore?.get(assetId, atTick) ?? Promise.resolve(undefined);
  }

  /**
   * Safe-delete: throws if `assetId` still has incoming Dependency Graph
   * references, unless `force` is set. See docs/14-assets/metadata.md.
   */
  async delete(assetId: AssetId, options: { force?: boolean } = {}): Promise<void> {
    const references = this.dependencyGraph.getReferences(assetId);
    if (references.length > 0 && !options.force) {
      throw new Error(
        `AssetManager: cannot delete "${assetId}", still referenced by ${references.length} TrackItem(s)`,
      );
    }

    const entry = await this.options.catalog.get(assetId);
    await this.options.catalog.remove(assetId);
    if (entry) {
      await this.options.blobStore.delete(entry.contentHash);
      await this.options.thumbnailStore?.deleteAllForAsset(assetId);
      await this.options.waveformStore?.delete(assetId);
    }
    this.options.events?.emit("AssetDeleted", { assetId });
  }

  /** Called by the future Editor Service/command handlers whenever a TrackItem starts pointing at an asset. */
  registerReference(assetId: AssetId, referenceId: string): void {
    this.dependencyGraph.registerReference(assetId, referenceId);
  }

  unregisterReference(referenceId: string): void {
    this.dependencyGraph.unregisterReference(referenceId);
  }

  /** "Unused assets" view (PLAN.md) = assets with zero incoming dependency references. */
  async listUnused(): Promise<IAssetCatalogEntry[]> {
    const all = await this.options.catalog.list();
    return all.filter((entry) => this.dependencyGraph.isUnused(entry.id));
  }
}
