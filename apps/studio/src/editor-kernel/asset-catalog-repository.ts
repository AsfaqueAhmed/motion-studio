import { JsonRepository, type IVFS } from "@motion-studio/storage";
import type { IAssetCatalogEntry } from "@motion-studio/assets";

/**
 * `AssetCatalog` (assets package) depends on `IAssetCatalogStore`
 * (create/delete/get/list) rather than importing `@motion-studio/storage`
 * directly — see `asset-catalog.ts`'s doc comment on why. `JsonRepository`
 * already implements that shape (plus `update`, which the interface just
 * doesn't need), so this is the entire adapter: pick a VFS directory and
 * extend it. "settings" is one of `StorageEngine`'s IndexedDB-routed
 * top-level directories.
 */
export class AssetCatalogRepository extends JsonRepository<IAssetCatalogEntry> {
  constructor(vfs: IVFS) {
    super(vfs, "settings/asset-catalog");
  }
}
