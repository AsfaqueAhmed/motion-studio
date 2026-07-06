import type { AssetId, Tick } from "@motion-studio/shared";
import type { IVFS } from "./vfs";

const THUMBNAILS_DIR = "thumbnails";
const THUMBNAIL_PATTERN = /^thumbnails\/[^/]+\/(\d+)$/;

/**
 * Thumbnail images, keyed by `assetId + timestamp` (the Tick within the
 * asset the thumbnail was generated at) — shared by Timeline UI and Asset
 * Browser. See docs/12-storage/thumbnail-cache.md. Binary image data, so
 * this stores raw bytes directly rather than going through JsonRepository.
 */
export class ThumbnailCache {
  constructor(private readonly vfs: IVFS) {}

  put(assetId: AssetId, atTick: Tick, data: Uint8Array): Promise<void> {
    return this.vfs.write(this.pathFor(assetId, atTick), data);
  }

  get(assetId: AssetId, atTick: Tick): Promise<Uint8Array | undefined> {
    return this.vfs.read(this.pathFor(assetId, atTick));
  }

  has(assetId: AssetId, atTick: Tick): Promise<boolean> {
    return this.vfs.exists(this.pathFor(assetId, atTick));
  }

  async listTicks(assetId: AssetId): Promise<Tick[]> {
    const paths = await this.vfs.list(`${THUMBNAILS_DIR}/${assetId}/`);
    const ticks: Tick[] = [];
    for (const path of paths) {
      const match = THUMBNAIL_PATTERN.exec(path);
      const tick = match?.[1];
      if (tick) {
        ticks.push(Number(tick) as Tick);
      }
    }
    return ticks;
  }

  async deleteAllForAsset(assetId: AssetId): Promise<void> {
    const ticks = await this.listTicks(assetId);
    await Promise.all(ticks.map((tick) => this.vfs.delete(this.pathFor(assetId, tick))));
  }

  private pathFor(assetId: AssetId, atTick: Tick): string {
    return `${THUMBNAILS_DIR}/${assetId}/${atTick}`;
  }
}
