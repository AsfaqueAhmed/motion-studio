import {
  AssetType,
  createAssetId,
  toTick,
  type AppEventMap,
  type AppEventType,
} from "@motion-studio/shared";
import type { AssetCatalog, IAssetCatalogEntry } from "./asset-catalog";
import type { IAssetBlobStore, IThumbnailStore, IWaveformStore } from "./asset-storage";
import type { IMetadataExtractor } from "./metadata";
import { detectAssetType } from "./supported-types";
import type { IThumbnailGenerator } from "./thumbnail-generator";
import type { IWaveformGenerator } from "./waveform-generator";

/** Same generic shape as Export's `IExportEventSink` / History's `IHistoryEventSink`. */
export interface IAssetEventSink {
  emit<T extends AppEventType>(type: T, payload: AppEventMap[T]): void;
}

export interface IAssetImportInput {
  readonly fileName: string;
  readonly mimeType: string;
  readonly data: Uint8Array;
  readonly tags?: readonly string[];
}

export interface IAssetImportDependencies {
  readonly blobStore: IAssetBlobStore;
  readonly catalog: AssetCatalog;
  readonly metadataExtractor: IMetadataExtractor;
  readonly thumbnailGenerator?: IThumbnailGenerator;
  readonly thumbnailStore?: IThumbnailStore;
  readonly waveformGenerator?: IWaveformGenerator;
  readonly waveformStore?: IWaveformStore;
  readonly events?: IAssetEventSink;
}

/**
 * `docs/14-assets/importer.md`'s pipeline: validate -> hash -> store (via
 * `IAssetBlobStore`, dedup for free) -> detect type -> metadata ->
 * thumbnail -> waveform -> register in catalog -> ready. Runs on the
 * caller's thread today — worker wiring is the same "not yet plumbed" gap
 * as Export's job runner (Phase 10). Proxy generation
 * (`docs/14-assets/overview.md` "Proxy system") is intentionally out of
 * Phase 12's scope — not in PLAN.md's checklist.
 *
 * The content hash *is* the asset id, so re-importing identical bytes
 * resolves to the same catalog entry without a separate "look up by hash"
 * pass, and without re-running metadata/thumbnail/waveform extraction.
 */
export async function importAsset(
  input: IAssetImportInput,
  deps: IAssetImportDependencies,
): Promise<IAssetCatalogEntry> {
  try {
    if (input.data.byteLength === 0) {
      throw new Error(`AssetImport: "${input.fileName}" is empty`);
    }

    const type = detectAssetType(input.fileName, input.mimeType);
    if (type === undefined) {
      throw new Error(`AssetImport: unsupported type for "${input.fileName}" (${input.mimeType})`);
    }

    const contentHash = await deps.blobStore.put(input.data);
    const assetId = createAssetId(contentHash);

    const existing = await deps.catalog.get(assetId);
    if (existing) {
      return existing;
    }

    const metadata = await deps.metadataExtractor.extract(input.data, type, input.mimeType);

    if (deps.thumbnailGenerator && deps.thumbnailStore) {
      const thumbnail = await deps.thumbnailGenerator.generate(input.data, type, input.mimeType);
      if (thumbnail) {
        await deps.thumbnailStore.put(assetId, toTick(0), thumbnail);
      }
    }

    const hasAudioTrack =
      type === AssetType.Audio || (metadata.type === AssetType.Video && metadata.hasAudio);
    if (hasAudioTrack && deps.waveformGenerator && deps.waveformStore) {
      const waveform = await deps.waveformGenerator.generate(input.data);
      await deps.waveformStore.create({
        id: assetId,
        sampleRate: waveform.sampleRate,
        peaks: [...waveform.peaks],
      });
    }

    const durationTicks =
      metadata.type === AssetType.Video || metadata.type === AssetType.Audio
        ? metadata.durationTicks
        : undefined;

    const width =
      metadata.type === AssetType.Video || metadata.type === AssetType.Image
        ? metadata.width
        : undefined;
    const height =
      metadata.type === AssetType.Video || metadata.type === AssetType.Image
        ? metadata.height
        : undefined;

    const entry: IAssetCatalogEntry = {
      id: assetId,
      name: input.fileName,
      type,
      mimeType: input.mimeType,
      sizeBytes: input.data.byteLength,
      durationTicks,
      width,
      height,
      contentHash,
      tags: input.tags ? [...input.tags] : [],
      createdAt: Date.now(),
    };

    await deps.catalog.register(entry);
    deps.events?.emit("AssetImported", { assetId });
    return entry;
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    deps.events?.emit("AssetImportFailed", { reason });
    throw error;
  }
}
