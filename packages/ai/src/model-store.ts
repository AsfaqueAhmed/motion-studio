/**
 * DI interface for OPFS-backed model weight storage, keyed by model id —
 * structurally matches how a real `@motion-studio/storage`-backed cache
 * would satisfy this (mirroring `packages/assets/src/asset-storage.ts`'s
 * `IAssetBlobStore` for `AssetBlobStore`). No real store is wired yet; the
 * AI package never touches IndexedDB/OPFS directly (CLAUDE.md "Only the
 * Storage engine touches IndexedDB/OPFS. Everything else goes through the
 * VFS"), so this is the DI boundary a future `@motion-studio/storage`
 * `ModelBlobStore` would satisfy.
 */
export interface IModelBlobStore {
  get(modelId: string): Promise<Uint8Array | undefined>;
  put(modelId: string, data: Uint8Array): Promise<void>;
  has(modelId: string): Promise<boolean>;
  delete(modelId: string): Promise<void>;
}
