import { AssetType, toTick } from "@motion-studio/shared";
import { describe, expect, it } from "vitest";
import { AssetCatalog } from "./asset-catalog";
import { importAsset, type IAssetImportDependencies } from "./import-pipeline";
import {
  FakeAssetBlobStore,
  FakeAssetCatalogStore,
  FakeAssetEventSink,
  FakeMetadataExtractor,
  FakeThumbnailGenerator,
  FakeThumbnailStore,
  FakeWaveformGenerator,
  FakeWaveformStore,
} from "./test-support/fakes";

function makeDeps(overrides: Partial<IAssetImportDependencies> = {}): IAssetImportDependencies {
  return {
    blobStore: new FakeAssetBlobStore(),
    catalog: new AssetCatalog(new FakeAssetCatalogStore()),
    metadataExtractor: new FakeMetadataExtractor(
      () => ({ type: AssetType.Image, width: 100, height: 100 }) as never,
    ),
    ...overrides,
  };
}

describe("importAsset", () => {
  it("rejects empty data before hashing", async () => {
    const deps = makeDeps();
    await expect(
      importAsset({ fileName: "empty.png", mimeType: "image/png", data: new Uint8Array() }, deps),
    ).rejects.toThrow(/empty/);
  });

  it("rejects unsupported types", async () => {
    const deps = makeDeps();
    await expect(
      importAsset(
        { fileName: "archive.zip", mimeType: "application/zip", data: new Uint8Array([1]) },
        deps,
      ),
    ).rejects.toThrow(/unsupported type/);
  });

  it("registers a catalog entry, storing bytes via the blob store, and emits AssetImported", async () => {
    const events = new FakeAssetEventSink();
    const deps = makeDeps({ events });
    const data = new Uint8Array([1, 2, 3]);

    const entry = await importAsset({ fileName: "photo.png", mimeType: "image/png", data }, deps);

    expect(entry.name).toBe("photo.png");
    expect(entry.type).toBe(AssetType.Image);
    expect(entry.sizeBytes).toBe(3);
    expect(await deps.catalog.get(entry.id)).toEqual(entry);
    expect(events.events).toEqual([{ type: "AssetImported", payload: { assetId: entry.id } }]);
  });

  it("dedups by content hash — importing identical bytes twice yields one catalog entry", async () => {
    let extractCalls = 0;
    const metadataExtractor = new FakeMetadataExtractor(() => {
      extractCalls += 1;
      return { type: AssetType.Image, width: 1, height: 1 } as never;
    });
    const deps = makeDeps({ metadataExtractor });
    const data = new Uint8Array([9, 9, 9]);

    const first = await importAsset({ fileName: "a.png", mimeType: "image/png", data }, deps);
    const second = await importAsset({ fileName: "a-copy.png", mimeType: "image/png", data }, deps);

    expect(second.id).toBe(first.id);
    expect(await deps.catalog.list()).toHaveLength(1);
    expect(extractCalls).toBe(1);
  });

  it("generates and stores a thumbnail for image/video types", async () => {
    const thumbnailStore = new FakeThumbnailStore();
    const thumbnailGenerator = new FakeThumbnailGenerator(new Uint8Array([7]));
    const deps = makeDeps({ thumbnailGenerator, thumbnailStore });

    const entry = await importAsset(
      { fileName: "photo.png", mimeType: "image/png", data: new Uint8Array([1]) },
      deps,
    );

    expect(thumbnailGenerator.calls).toEqual([AssetType.Image]);
    expect(thumbnailStore.thumbnails.get(entry.id)?.get(toTick(0))).toEqual(new Uint8Array([7]));
  });

  it("generates and stores a waveform for audio, and carries durationTicks from metadata", async () => {
    const waveformStore = new FakeWaveformStore();
    const waveformGenerator = new FakeWaveformGenerator({ sampleRate: 44100, peaks: [1, 2] });
    const deps = makeDeps({
      metadataExtractor: new FakeMetadataExtractor(
        () =>
          ({
            type: AssetType.Audio,
            durationTicks: toTick(900),
            sampleRate: 44100,
            numberOfChannels: 2,
          }) as never,
      ),
      waveformGenerator,
      waveformStore,
    });

    const entry = await importAsset(
      { fileName: "song.mp3", mimeType: "audio/mpeg", data: new Uint8Array([1]) },
      deps,
    );

    expect(entry.durationTicks).toBe(toTick(900));
    expect(waveformGenerator.calls).toBe(1);
    expect(waveformStore.records.get(entry.id)).toEqual({
      id: entry.id,
      sampleRate: 44100,
      peaks: [1, 2],
    });
  });

  it("does not generate a waveform for a video with no audio track", async () => {
    const waveformStore = new FakeWaveformStore();
    const waveformGenerator = new FakeWaveformGenerator();
    const deps = makeDeps({
      metadataExtractor: new FakeMetadataExtractor(
        () =>
          ({
            type: AssetType.Video,
            width: 1920,
            height: 1080,
            durationTicks: toTick(900),
            fps: 30,
            hasAudio: false,
          }) as never,
      ),
      waveformGenerator,
      waveformStore,
    });

    await importAsset(
      { fileName: "clip.mp4", mimeType: "video/mp4", data: new Uint8Array([1]) },
      deps,
    );

    expect(waveformGenerator.calls).toBe(0);
    expect(waveformStore.records.size).toBe(0);
  });

  it("emits AssetImportFailed and rethrows on failure", async () => {
    const events = new FakeAssetEventSink();
    const deps = makeDeps({ events });

    await expect(
      importAsset(
        { fileName: "bad.zip", mimeType: "application/zip", data: new Uint8Array([1]) },
        deps,
      ),
    ).rejects.toThrow();

    expect(events.events).toEqual([
      {
        type: "AssetImportFailed",
        payload: { reason: expect.stringContaining("unsupported type") },
      },
    ]);
  });
});
