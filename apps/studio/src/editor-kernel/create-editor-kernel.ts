import { AppEngine } from "@motion-studio/core";
import {
  TrackType,
  createCompositionId,
  createTrackId,
  secondsToTicks,
} from "@motion-studio/shared";
import { StorageEngine, AssetBlobStore, ThumbnailCache } from "@motion-studio/storage";
import { AssetCatalog, AssetManager } from "@motion-studio/assets";
import { LayerEngine } from "@motion-studio/layer";
import { TimelineEngine, createComposition, createTrack } from "@motion-studio/timeline";
import { AnimationEngine } from "@motion-studio/animation";
import { HistoryEngine } from "@motion-studio/history";
import {
  PluginEngine,
  createSelectToolPlugin,
  SELECT_TOOL_PLUGIN_MANIFEST,
} from "@motion-studio/plugin";
import { AssetCatalogRepository } from "./asset-catalog-repository";
import { browserMetadataExtractor } from "./metadata-extractor";
import { browserThumbnailGenerator } from "./thumbnail-generator";
import { ToolRegistry } from "./tool-registry";
import { EditorKernel } from "./editor-kernel";

const DEFAULT_COMPOSITION_ID = createCompositionId("default-composition");
const DEFAULT_FPS = 30;
const DEFAULT_DURATION_SECONDS = 60;

/**
 * Assembles the 8 engines this phase's panels touch (Storage, Assets,
 * Layer, Timeline, Animation, History, Plugin, and — via `toolRegistry` —
 * the plugin-facing half of what would become a Tool Registry) into one
 * running `AppEngine`, plus the Command Bus/Editor Services on top. This is
 * the integration layer every phase since 7 flagged as not existing yet.
 * Audio/Export/AI/Effects are out of scope this phase (no panel needs
 * them) — see `EditorKernel`'s doc comment.
 *
 * Browser-only (opens real IndexedDB/OPFS) — must only run from a Client
 * Component, never during Next.js SSR.
 */
export async function createEditorKernel(): Promise<EditorKernel> {
  const appEngine = new AppEngine();

  const storageEngine = new StorageEngine();
  const blobStore = new AssetBlobStore(storageEngine);
  const catalog = new AssetCatalog(new AssetCatalogRepository(storageEngine));
  const assetManager = new AssetManager({
    blobStore,
    catalog,
    metadataExtractor: browserMetadataExtractor,
    thumbnailGenerator: browserThumbnailGenerator,
    thumbnailStore: new ThumbnailCache(storageEngine),
    events: appEngine.events,
  });

  const layerEngine = new LayerEngine();
  const timelineEngine = new TimelineEngine();
  const animationEngine = new AnimationEngine();
  const historyEngine = new HistoryEngine({ events: appEngine.events });

  const toolRegistry = new ToolRegistry();
  const pluginEngine = new PluginEngine({
    hostApi: {
      effects: undefined,
      export: undefined,
      ai: undefined,
      tools: toolRegistry,
      panels: undefined,
    },
    events: appEngine.events,
  });

  appEngine.registerEngine(storageEngine);
  appEngine.registerEngine(assetManager);
  appEngine.registerEngine(layerEngine);
  appEngine.registerEngine(timelineEngine);
  appEngine.registerEngine(animationEngine);
  appEngine.registerEngine(historyEngine);
  appEngine.registerEngine(pluginEngine);

  await appEngine.start();

  seedDefaultComposition(timelineEngine);

  pluginEngine.register(createSelectToolPlugin(), SELECT_TOOL_PLUGIN_MANIFEST);
  await pluginEngine.activate(SELECT_TOOL_PLUGIN_MANIFEST.id);
  toolRegistry.activate("select");

  return new EditorKernel(
    appEngine,
    storageEngine,
    assetManager,
    layerEngine,
    timelineEngine,
    animationEngine,
    historyEngine,
    pluginEngine,
    toolRegistry,
    DEFAULT_COMPOSITION_ID,
  );
}

/**
 * No Project Service/persistence exists yet (out of this phase's scope,
 * same gap `docs/04-core/core-overview.md` flags for `AppEngine`), so this
 * seeds one Composition with a video and an audio Track — just enough for
 * the vertical slice's "import a clip → drop it on the Timeline" flow to
 * have somewhere to go. Not dispatched through the Command Bus: this is
 * initial engine state, not a user-undoable edit.
 */
function seedDefaultComposition(timelineEngine: TimelineEngine): void {
  const composition = createComposition({
    id: DEFAULT_COMPOSITION_ID,
    name: "Untitled Composition",
    width: 1920,
    height: 1080,
    fps: DEFAULT_FPS,
    durationTicks: secondsToTicks(DEFAULT_DURATION_SECONDS, DEFAULT_FPS),
  });
  timelineEngine.compositions.add(composition);

  timelineEngine.addTrack(
    composition.id,
    createTrack({ id: createTrackId("v1"), type: TrackType.Video, label: "V1" }),
  );
  timelineEngine.addTrack(
    composition.id,
    createTrack({ id: createTrackId("a1"), type: TrackType.Audio, label: "A1" }),
  );
}
