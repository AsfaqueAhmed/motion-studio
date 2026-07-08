import type { AssetId } from "@motion-studio/shared";
import type { AssetManager, IAssetCatalogEntry, IAssetImportInput } from "@motion-studio/assets";

/**
 * Thin passthrough over `AssetManager` (ADR-002: one asset engine, the
 * Asset Browser owns no registry of its own). Import isn't dispatched
 * through the Command Bus — bringing a file into the local catalog isn't a
 * "project edit" in the undo/redo sense (undoing it wouldn't meaningfully
 * un-hash the bytes back out of OPFS), unlike placing that asset on the
 * Timeline, which does go through `TimelineEditorService`/History.
 */
export class AssetEditorService {
  constructor(private readonly assetManager: AssetManager) {}

  import(input: IAssetImportInput): Promise<IAssetCatalogEntry> {
    return this.assetManager.import(input);
  }

  list(): Promise<IAssetCatalogEntry[]> {
    return this.assetManager.list();
  }

  listUnused(): Promise<IAssetCatalogEntry[]> {
    return this.assetManager.listUnused();
  }

  getThumbnail(assetId: AssetId): Promise<Uint8Array | undefined> {
    return this.assetManager.getThumbnail(assetId);
  }

  delete(assetId: AssetId): Promise<void> {
    return this.assetManager.delete(assetId);
  }
}
