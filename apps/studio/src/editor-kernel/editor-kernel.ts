import type { AppEngine } from "@motion-studio/core";
import type { CompositionId } from "@motion-studio/shared";
import type { StorageEngine } from "@motion-studio/storage";
import type { AssetManager } from "@motion-studio/assets";
import type { LayerEngine } from "@motion-studio/layer";
import type { TimelineEngine } from "@motion-studio/timeline";
import type { AnimationEngine } from "@motion-studio/animation";
import type { HistoryEngine } from "@motion-studio/history";
import type { PluginEngine } from "@motion-studio/plugin";
import { CommandBus } from "./command-bus";
import type { ToolRegistry } from "./tool-registry";
import { PropertySchemaRegistry } from "./property-schema-registry";
import { ShortcutService } from "./shortcuts/shortcut-service";
import { TimelineEditorService } from "./services/timeline-editor-service";
import { InspectorEditorService } from "./services/inspector-editor-service";
import { AssetEditorService } from "./services/asset-editor-service";
import { PlaybackService } from "./services/playback-service";

/**
 * Holds one instance of every engine this phase wires up, plus the Command
 * Bus/Editor Services/registries built on top of them — the integration
 * layer `PluginEngine`'s doc comment (Phase 14) and every phase since 7 has
 * flagged as missing. Audio/Export/AI/Effects are deliberately not
 * constructed here (no panel needs them yet, per Phase 15's scope decision)
 * — `appEngine.registerEngine` only ever sees the 8 engines this phase's
 * panels actually touch. `RenderingEngine` is notably absent too: it needs
 * a real `<canvas>` element, which only exists once the Canvas panel
 * mounts, so that engine's lifecycle is owned by the Canvas panel
 * component itself (`render-backend-factory.ts`), not by `AppEngine`.
 */
export class EditorKernel {
  readonly commandBus: CommandBus;
  readonly propertySchemaRegistry: PropertySchemaRegistry;
  readonly shortcuts = new ShortcutService();

  readonly timelineEditor: TimelineEditorService;
  readonly inspectorEditor: InspectorEditorService;
  readonly assetEditor: AssetEditorService;
  readonly playback: PlaybackService;

  constructor(
    readonly appEngine: AppEngine,
    readonly storageEngine: StorageEngine,
    readonly assetManager: AssetManager,
    readonly layerEngine: LayerEngine,
    readonly timelineEngine: TimelineEngine,
    readonly animationEngine: AnimationEngine,
    readonly historyEngine: HistoryEngine,
    readonly pluginEngine: PluginEngine,
    /** Constructed once in `createEditorKernel` and handed to `PluginEngine`'s `hostApi.tools` too — must be the same instance both places. */
    readonly toolRegistry: ToolRegistry,
    readonly defaultCompositionId: CompositionId,
  ) {
    this.commandBus = new CommandBus(historyEngine);
    this.propertySchemaRegistry = new PropertySchemaRegistry(animationEngine.properties);
    this.timelineEditor = new TimelineEditorService(
      timelineEngine,
      layerEngine,
      assetManager,
      this.commandBus,
    );
    this.inspectorEditor = new InspectorEditorService(
      layerEngine,
      animationEngine,
      this.commandBus,
    );
    this.assetEditor = new AssetEditorService(assetManager);

    const composition = timelineEngine.requireComposition(defaultCompositionId);
    this.playback = new PlaybackService(composition.durationTicks, composition.fps);
  }

  shutdown(): Promise<void> {
    return this.appEngine.shutdown();
  }
}
