import type { AppEventMap, AppEventType, AssetId, AssetType, Tick } from "@motion-studio/shared";
import type { IAssetCatalogEntry, IAssetCatalogStore } from "../asset-catalog";
import type {
  IAssetBlobStore,
  IThumbnailStore,
  IWaveformRecord,
  IWaveformStore,
} from "../asset-storage";
import type { IAssetMetadata, IMetadataExtractor } from "../metadata";
import type { IAssetEventSink } from "../import-pipeline";
import type { IThumbnailGenerator } from "../thumbnail-generator";
import type { IWaveformGenerator, IWaveformPeaks } from "../waveform-generator";

/** Always-succeeding in-memory fakes of the Asset Manager's DI surface — no real OPFS/decoder exists in this package's Node test environment, matching `packages/export/src/test-support/fakes.ts`'s approach. */

/** Deterministic, non-cryptographic content identity for tests — production hashing is `AssetBlobStore`'s job (Phase 3). */
function fakeHash(data: Uint8Array): string {
  let hash = 0;
  for (const byte of data) {
    hash = (hash * 31 + byte) >>> 0;
  }
  return `${hash.toString(16)}-${data.byteLength}`;
}

export class FakeAssetBlobStore implements IAssetBlobStore {
  readonly blobs = new Map<string, Uint8Array>();

  async put(data: Uint8Array): Promise<string> {
    const hash = fakeHash(data);
    if (!this.blobs.has(hash)) {
      this.blobs.set(hash, data);
    }
    return hash;
  }

  async get(hash: string): Promise<Uint8Array | undefined> {
    return this.blobs.get(hash);
  }

  async has(hash: string): Promise<boolean> {
    return this.blobs.has(hash);
  }

  async delete(hash: string): Promise<void> {
    this.blobs.delete(hash);
  }
}

export class FakeAssetCatalogStore implements IAssetCatalogStore {
  readonly entries = new Map<string, IAssetCatalogEntry>();

  async create(entry: IAssetCatalogEntry): Promise<void> {
    this.entries.set(entry.id, entry);
  }

  async delete(id: AssetId): Promise<void> {
    this.entries.delete(id);
  }

  async get(id: AssetId): Promise<IAssetCatalogEntry | undefined> {
    return this.entries.get(id);
  }

  async list(): Promise<IAssetCatalogEntry[]> {
    return Array.from(this.entries.values());
  }
}

export class FakeThumbnailStore implements IThumbnailStore {
  readonly thumbnails = new Map<string, Map<Tick, Uint8Array>>();

  async put(assetId: AssetId, atTick: Tick, data: Uint8Array): Promise<void> {
    const byTick = this.thumbnails.get(assetId) ?? new Map<Tick, Uint8Array>();
    byTick.set(atTick, data);
    this.thumbnails.set(assetId, byTick);
  }

  async get(assetId: AssetId, atTick: Tick): Promise<Uint8Array | undefined> {
    return this.thumbnails.get(assetId)?.get(atTick);
  }

  async deleteAllForAsset(assetId: AssetId): Promise<void> {
    this.thumbnails.delete(assetId);
  }
}

export class FakeWaveformStore implements IWaveformStore {
  readonly records = new Map<string, IWaveformRecord>();

  async create(record: IWaveformRecord): Promise<void> {
    this.records.set(record.id, record);
  }

  async delete(id: string): Promise<void> {
    this.records.delete(id);
  }
}

export class FakeMetadataExtractor implements IMetadataExtractor {
  constructor(private readonly build: (type: AssetType) => IAssetMetadata) {}

  async extract(_data: Uint8Array, type: AssetType): Promise<IAssetMetadata> {
    return this.build(type);
  }
}

export class FakeThumbnailGenerator implements IThumbnailGenerator {
  readonly calls: AssetType[] = [];

  constructor(private readonly result: Uint8Array | undefined = new Uint8Array([1, 2, 3])) {}

  async generate(_data: Uint8Array, type: AssetType): Promise<Uint8Array | undefined> {
    this.calls.push(type);
    return this.result;
  }
}

export class FakeWaveformGenerator implements IWaveformGenerator {
  calls = 0;

  constructor(private readonly result: IWaveformPeaks = { sampleRate: 48000, peaks: [0, 1, 0] }) {}

  async generate(): Promise<IWaveformPeaks> {
    this.calls += 1;
    return this.result;
  }
}

export class FakeAssetEventSink implements IAssetEventSink {
  readonly events: { type: AppEventType; payload: unknown }[] = [];

  emit<T extends AppEventType>(type: T, payload: AppEventMap[T]): void {
    this.events.push({ type, payload });
  }
}
