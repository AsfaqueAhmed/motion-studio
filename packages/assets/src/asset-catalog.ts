import type { AssetId, AssetType, Tick } from "@motion-studio/shared";

/**
 * One row per imported asset. PLAN.md Phase 12 "Asset catalog": id, name,
 * type, size, duration, contentHash, tags, createdAt. `id` doubles as the
 * dedup key — the import pipeline derives it from `contentHash`, so
 * re-importing identical bytes resolves to the same `id` (PLAN.md "Dedup
 * by content hash"), never a second catalog row.
 */
export interface IAssetCatalogEntry {
  readonly id: AssetId;
  readonly name: string;
  readonly type: AssetType;
  readonly mimeType: string;
  readonly sizeBytes: number;
  /** Present for Video/Audio only. */
  readonly durationTicks: Tick | undefined;
  readonly contentHash: string;
  readonly tags: readonly string[];
  readonly createdAt: number;
}

/**
 * Structurally matches `@motion-studio/storage`'s `IRepository<T>` shape
 * (`create/update/delete/get/list`) so a real `JsonRepository<IAssetCatalogEntry>`
 * satisfies this without `@motion-studio/assets` importing `@motion-studio/storage`
 * — same DI convention as `IAssetBlobStore`. No real backing store wired yet.
 */
export interface IAssetCatalogStore {
  create(entry: IAssetCatalogEntry): Promise<void>;
  delete(id: AssetId): Promise<void>;
  get(id: AssetId): Promise<IAssetCatalogEntry | undefined>;
  list(): Promise<IAssetCatalogEntry[]>;
}

/**
 * Thin query layer over `IAssetCatalogStore` — the "single source of truth
 * for all assets" (PLAN.md). Per ADR-002, `17-ui/asset-browser.md` reads
 * through this and keeps no registry of its own.
 */
export class AssetCatalog {
  constructor(private readonly store: IAssetCatalogStore) {}

  register(entry: IAssetCatalogEntry): Promise<void> {
    return this.store.create(entry);
  }

  get(id: AssetId): Promise<IAssetCatalogEntry | undefined> {
    return this.store.get(id);
  }

  remove(id: AssetId): Promise<void> {
    return this.store.delete(id);
  }

  list(): Promise<IAssetCatalogEntry[]> {
    return this.store.list();
  }
}
