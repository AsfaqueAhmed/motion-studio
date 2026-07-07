import type { AssetId, Tick } from "@motion-studio/shared";

/**
 * Structurally matches `@motion-studio/storage`'s real `AssetBlobStore`
 * (Phase 3) — a DI interface, not an import, matching every other engine's
 * cross-engine-avoidance convention (Export's `IMuxerFactory`, Audio's
 * `IAudioContext`). No actual `@motion-studio/storage` dependency is wired
 * yet; `put()` already hashes+dedups content, so the Asset Manager never
 * re-implements hashing itself. See docs/14-assets/importer.md.
 */
export interface IAssetBlobStore {
  put(data: Uint8Array): Promise<string>;
  get(hash: string): Promise<Uint8Array | undefined>;
  has(hash: string): Promise<boolean>;
  delete(hash: string): Promise<void>;
}

/** Structurally matches `@motion-studio/storage`'s real `ThumbnailCache` (Phase 3/9-adjacent). */
export interface IThumbnailStore {
  put(assetId: AssetId, atTick: Tick, data: Uint8Array): Promise<void>;
  deleteAllForAsset(assetId: AssetId): Promise<void>;
}

export interface IWaveformRecord {
  id: string;
  sampleRate: number;
  peaks: number[];
}

/** Structurally matches `@motion-studio/storage`'s real `WaveformRepository` (Phase 3). */
export interface IWaveformStore {
  create(record: IWaveformRecord): Promise<void>;
  delete(id: string): Promise<void>;
}
