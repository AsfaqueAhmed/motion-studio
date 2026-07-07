import type { AssetId, ICommand } from "@motion-studio/shared";
import type { AssetManager } from "@motion-studio/assets";

/**
 * Keeps the Asset Dependency Graph (`AssetManager.registerReference`) in
 * sync with undo/redo — without this, undoing an `AddClipFromAssetIntent`
 * would remove the TrackItem but leave the asset marked as still
 * referenced, breaking `listUnused()`/safe-delete. Bundled into the same
 * `CompositeCommand` as the Layer/TrackItem creation so one undo step
 * reverts all three together.
 */
export class RegisterAssetReferenceCommand implements ICommand {
  readonly label = "Reference asset";

  constructor(
    readonly id: string,
    private readonly assetManager: AssetManager,
    private readonly assetId: AssetId,
    private readonly referenceId: string,
  ) {}

  execute(): void {
    this.assetManager.registerReference(this.assetId, this.referenceId);
  }

  undo(): void {
    this.assetManager.unregisterReference(this.referenceId);
  }

  redo(): void {
    this.execute();
  }
}
