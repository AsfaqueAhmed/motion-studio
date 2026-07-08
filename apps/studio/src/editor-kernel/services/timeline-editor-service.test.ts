import {
  AssetType,
  TrackType,
  createAssetId,
  createCompositionId,
  createTrackId,
  toTick,
} from "@motion-studio/shared";
import { LayerEngine } from "@motion-studio/layer";
import { TimelineEngine, createComposition, createTrack } from "@motion-studio/timeline";
import { HistoryEngine } from "@motion-studio/history";
import {
  AssetCatalog,
  AssetManager,
  type IAssetCatalogEntry,
  type IMetadataExtractor,
} from "@motion-studio/assets";
import { beforeEach, describe, expect, it } from "vitest";
import { CommandBus } from "../command-bus";
import { TimelineEditorService } from "./timeline-editor-service";

function fakeAssetManager(): AssetManager {
  const entries = new Map<string, IAssetCatalogEntry>();
  const metadataExtractor: IMetadataExtractor = {
    extract: () => Promise.resolve({ type: AssetType.Image, width: 1, height: 1 }),
  };
  const catalog = new AssetCatalog({
    create: async (entry) => void entries.set(entry.id, entry),
    get: async (id) => entries.get(id),
    delete: async (id) => void entries.delete(id),
    list: async () => Array.from(entries.values()),
  });
  return new AssetManager({
    blobStore: {
      put: () => Promise.resolve("hash"),
      get: () => Promise.resolve(undefined),
      has: () => Promise.resolve(false),
      delete: () => Promise.resolve(),
    },
    catalog,
    metadataExtractor,
  });
}

describe("TimelineEditorService", () => {
  const compositionId = createCompositionId("comp-1");
  const trackId = createTrackId("v1");
  let layerEngine: LayerEngine;
  let timelineEngine: TimelineEngine;
  let commandBus: CommandBus;
  let service: TimelineEditorService;

  beforeEach(() => {
    layerEngine = new LayerEngine();
    timelineEngine = new TimelineEngine();
    commandBus = new CommandBus(new HistoryEngine());
    service = new TimelineEditorService(
      timelineEngine,
      layerEngine,
      fakeAssetManager(),
      commandBus,
    );

    timelineEngine.compositions.add(
      createComposition({
        id: compositionId,
        name: "Comp",
        width: 100,
        height: 100,
        fps: 30,
        durationTicks: toTick(9000),
      }),
    );
    timelineEngine.addTrack(
      compositionId,
      createTrack({ id: trackId, type: TrackType.Video, label: "V1" }),
    );
  });

  it("creates a Layer and a TrackItem for an image asset in one undoable step", () => {
    const trackItemId = service.addClipFromAsset({
      type: "AddClipFromAsset",
      payload: {
        trackId,
        assetId: createAssetId("asset-1"),
        assetType: AssetType.Image,
        name: "Photo",
        startTick: toTick(0),
        durationTicks: toTick(90),
      },
    });

    const item = timelineEngine.requireTrackItem(trackItemId);
    const layer = layerEngine.registry.get(item.layerId);
    expect(layer?.name).toBe("Photo");
    expect(commandBus.canUndo).toBe(true);

    commandBus.undo();
    expect(timelineEngine.trackItems.has(trackItemId)).toBe(false);
    expect(layerEngine.registry.has(item.layerId)).toBe(false);
  });

  it("rejects placing a Font asset on the Timeline", () => {
    expect(() =>
      service.addClipFromAsset({
        type: "AddClipFromAsset",
        payload: {
          trackId,
          assetId: createAssetId("asset-2"),
          assetType: AssetType.Font,
          name: "Font",
          startTick: toTick(0),
          durationTicks: toTick(90),
        },
      }),
    ).toThrow(/cannot be placed/);
  });

  it("moves a TrackItem and undoes back to its previous position", () => {
    const trackItemId = service.addClipFromAsset({
      type: "AddClipFromAsset",
      payload: {
        trackId,
        assetId: createAssetId("asset-3"),
        assetType: AssetType.Image,
        name: "Photo",
        startTick: toTick(0),
        durationTicks: toTick(90),
      },
    });

    service.moveTrackItem({
      type: "MoveTrackItem",
      payload: { trackItemId, toTrackId: trackId, toStartTick: toTick(500) },
    });
    expect(timelineEngine.requireTrackItem(trackItemId).startTick).toBe(500);

    commandBus.undo();
    expect(timelineEngine.requireTrackItem(trackItemId).startTick).toBe(0);
  });

  it("deletes only the selected TrackItems, leaving their Layers in place (ADR-010 open)", () => {
    const trackItemId = service.addClipFromAsset({
      type: "AddClipFromAsset",
      payload: {
        trackId,
        assetId: createAssetId("asset-4"),
        assetType: AssetType.Image,
        name: "Photo",
        startTick: toTick(0),
        durationTicks: toTick(90),
      },
    });
    const layerId = timelineEngine.requireTrackItem(trackItemId).layerId;

    service.deleteSelection({ type: "DeleteSelection", payload: { trackItemIds: [trackItemId] } });

    expect(timelineEngine.trackItems.has(trackItemId)).toBe(false);
    expect(layerEngine.registry.has(layerId)).toBe(true);
  });

  it("changes the composition's frame size and undoes back to the previous one", () => {
    service.setCompositionSize({
      type: "SetCompositionSize",
      payload: { compositionId, width: 1080, height: 1920 },
    });

    expect(timelineEngine.requireComposition(compositionId)).toMatchObject({
      width: 1080,
      height: 1920,
    });

    commandBus.undo();
    expect(timelineEngine.requireComposition(compositionId)).toMatchObject({
      width: 100,
      height: 100,
    });
  });
});
