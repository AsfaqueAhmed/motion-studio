import type { AssetType } from "@motion-studio/shared";

/**
 * Pure pixel-generation step (`docs/14-assets/thumbnails.md`) — storing the
 * result is `IThumbnailStore`'s job, not this interface's. Only
 * Video/Image/Sticker-shaped assets produce a thumbnail; implementations
 * return `undefined` for Audio/Font/LUT. LOD-by-zoom-level (multiple
 * thumbnails per asset) is out of Phase 12's scope — one representative
 * thumbnail per asset only.
 */
export interface IThumbnailGenerator {
  generate(data: Uint8Array, type: AssetType, mimeType: string): Promise<Uint8Array | undefined>;
}
