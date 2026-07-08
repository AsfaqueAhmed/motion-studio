import {
  AssetType,
  createLayerId,
  createTrackItemId,
  type AssetId,
  type ILayer,
  type ITransform2D,
  type LayerId,
  type TrackItemId,
} from "@motion-studio/shared";
import { CompositeCommand } from "@motion-studio/history";
import {
  createAudioLayer,
  createImageLayer,
  createVideoLayer,
  type LayerEngine,
} from "@motion-studio/layer";
import {
  DeleteTrackItemCommand,
  MoveTrackItemCommand,
  UpdateCompositionSizeCommand,
  createTrackItem,
  type TimelineEngine,
} from "@motion-studio/timeline";
import type { AssetManager } from "@motion-studio/assets";
import type { CommandBus } from "../command-bus";
import { AddLayerCommand } from "../commands/add-layer-command";
import { AddTrackItemCommand } from "../commands/add-track-item-command";
import { RegisterAssetReferenceCommand } from "../commands/register-asset-reference-command";
import type {
  IAddClipFromAssetIntent,
  IDeleteSelectionIntent,
  IMoveTrackItemIntent,
  ISetCompositionSizeIntent,
} from "../intents";

/**
 * Resolves Timeline-shaped Intents into Commands dispatched through the
 * Command Bus — the "when" half of the Editor Service layer
 * (`17-ui/panels.md`). A thin façade, per that doc's "Open item" warning:
 * no coordination logic lives here that the Commands themselves don't
 * already encode.
 */
export class TimelineEditorService {
  constructor(
    private readonly timelineEngine: TimelineEngine,
    private readonly layerEngine: LayerEngine,
    private readonly assetManager: AssetManager,
    private readonly commandBus: CommandBus,
  ) {}

  /** Creates a Layer for the given asset and places it as a new TrackItem — one undo step for all three effects. */
  addClipFromAsset(intent: IAddClipFromAssetIntent): TrackItemId {
    const {
      trackId,
      compositionId,
      assetId,
      assetType,
      name,
      startTick,
      durationTicks,
      assetWidth,
      assetHeight,
    } = intent.payload;
    const layerId = createLayerId(crypto.randomUUID());
    const trackItemId = createTrackItemId(crypto.randomUUID());

    const composition = this.timelineEngine.requireComposition(compositionId);
    const transform = computeFitTransform(
      assetWidth,
      assetHeight,
      composition.width,
      composition.height,
    );
    const layer = this.createLayerForAsset(layerId, name, assetId, assetType, transform);
    const trackItem = createTrackItem({
      id: trackItemId,
      trackId,
      layerId,
      startTick,
      durationTicks,
    });

    const composite = new CompositeCommand(crypto.randomUUID(), "Add clip", [
      new AddLayerCommand(crypto.randomUUID(), this.layerEngine, layer),
      new AddTrackItemCommand(crypto.randomUUID(), this.timelineEngine, trackItem),
      new RegisterAssetReferenceCommand(
        crypto.randomUUID(),
        this.assetManager,
        assetId,
        trackItemId,
      ),
    ]);
    this.commandBus.execute(composite);
    return trackItemId;
  }

  moveTrackItem(intent: IMoveTrackItemIntent): void {
    const { trackItemId, toTrackId, toStartTick } = intent.payload;
    this.commandBus.execute(
      new MoveTrackItemCommand(
        crypto.randomUUID(),
        this.timelineEngine,
        trackItemId,
        toTrackId,
        toStartTick,
      ),
    );
  }

  /**
   * Removes the selected TrackItems only. Does **not** cascade to the
   * Layers they reference or any Animation clips on those Layers — ADR-010
   * ("does ripple-delete also remove linked items?") is still open, so this
   * deliberately doesn't invent a cascade policy. The underlying Layer (and
   * its Asset Dependency Graph reference) is left in place until that's
   * resolved.
   */
  deleteSelection(intent: IDeleteSelectionIntent): void {
    const { trackItemIds } = intent.payload;
    if (trackItemIds.length === 0) {
      return;
    }
    const commands = trackItemIds.map(
      (id) => new DeleteTrackItemCommand(crypto.randomUUID(), this.timelineEngine, id),
    );
    this.commandBus.execute(
      new CompositeCommand(crypto.randomUUID(), "Delete selection", commands),
    );
  }

  setCompositionSize(intent: ISetCompositionSizeIntent): void {
    const { compositionId, width, height } = intent.payload;
    this.commandBus.execute(
      new UpdateCompositionSizeCommand(
        crypto.randomUUID(),
        this.timelineEngine,
        compositionId,
        width,
        height,
      ),
    );
  }

  private createLayerForAsset(
    layerId: LayerId,
    name: string,
    assetId: AssetId,
    assetType: AssetType,
    transform: Partial<ITransform2D> | undefined,
  ): ILayer {
    switch (assetType) {
      case AssetType.Video:
        return createVideoLayer({ id: layerId, name, assetId, ...(transform && { transform }) });
      case AssetType.Image:
        return createImageLayer({ id: layerId, name, assetId, ...(transform && { transform }) });
      case AssetType.Audio:
        return createAudioLayer({ id: layerId, name, assetId });
      case AssetType.Font:
      case AssetType.LUT:
        throw new Error(
          `TimelineEditorService: asset type "${assetType}" cannot be placed on a Timeline.`,
        );
    }
  }
}

/**
 * Contain-fit, centered, anchored at the asset's own visual center — the
 * `IImageLayer.fitMode: "contain"` default finally has bounds/transform
 * math behind it, instead of every layer landing at `DEFAULT_TRANSFORM`
 * (native pixel size, pinned to the frame's top-left corner) regardless of
 * how it compares to the composition's actual size. `undefined` in/out
 * (e.g. Audio, which has no visual bounds) keeps the layer at
 * `DEFAULT_TRANSFORM` unchanged.
 */
function computeFitTransform(
  assetWidth: number | undefined,
  assetHeight: number | undefined,
  compositionWidth: number,
  compositionHeight: number,
): Partial<ITransform2D> | undefined {
  if (!assetWidth || !assetHeight) {
    return undefined;
  }
  const scale = Math.min(compositionWidth / assetWidth, compositionHeight / assetHeight);
  return {
    x: compositionWidth / 2,
    y: compositionHeight / 2,
    scaleX: scale,
    scaleY: scale,
    anchorX: assetWidth / 2,
    anchorY: assetHeight / 2,
  };
}
