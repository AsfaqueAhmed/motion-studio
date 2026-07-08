import { AssetType, type AssetId, type IBounds } from "@motion-studio/shared";
import type { AssetManager, IAssetCatalogEntry } from "@motion-studio/assets";
import type { ITextureSource, ITextureSourceProvider } from "@motion-studio/rendering";

interface IResolvedDimensions {
  readonly width: number;
  readonly height: number;
}

/** How far a video's `currentTime` may drift from the Playhead before we force a seek — avoids reassigning every frame and causing seek stutter. */
const SEEK_THRESHOLD_SECONDS = 1 / 30;

/**
 * Browser-API decode glue for real image/video texture content — same
 * `createImageBitmap`/`<video>` patterns as `metadata-extractor.ts`/
 * `thumbnail-generator.ts`, just kept alive instead of one-shot. Lives here
 * (not `packages/rendering`) because decode is a DOM concern the Rendering
 * Engine never owns (CLAUDE.md engine ownership table); this implements the
 * rendering package's injected `ITextureSourceProvider`.
 *
 * `resolve()` is a synchronous cache read — a miss triggers a background
 * decode and returns `undefined` for the current frame, so the backend
 * falls back to the placeholder color until the next frame after decode
 * finishes. No blocking awaits in the render loop.
 */
export class TextureSourceResolver implements ITextureSourceProvider {
  private readonly imageSources = new Map<AssetId, ImageBitmap>();
  private readonly videoSources = new Map<AssetId, HTMLVideoElement>();
  private readonly dimensions = new Map<AssetId, IResolvedDimensions>();
  private readonly pending = new Set<AssetId>();

  constructor(private readonly assetManager: AssetManager) {}

  resolve(assetId: AssetId): ITextureSource | undefined {
    const image = this.imageSources.get(assetId);
    if (image) {
      return {
        kind: "image-source",
        source: image,
        width: image.width,
        height: image.height,
        isLive: false,
      };
    }
    const video = this.videoSources.get(assetId);
    if (video && video.videoWidth > 0) {
      return {
        kind: "image-source",
        source: video,
        width: video.videoWidth,
        height: video.videoHeight,
        isLive: true,
      };
    }
    this.warm(assetId);
    return undefined;
  }

  /** Synchronous cache read of an asset's intrinsic pixel dimensions, `undefined` until resolved — same warm-in-background contract as `resolve()`. */
  getDimensions(assetId: AssetId): IBounds | undefined {
    const dims = this.dimensions.get(assetId);
    if (!dims) {
      this.warm(assetId);
      return undefined;
    }
    return { x: 0, y: 0, width: dims.width, height: dims.height };
  }

  /**
   * Plays/pauses every cached `<video>` in lockstep with the Playhead and,
   * while not playing, seeks toward `seconds` — an approximation, not a
   * frame-exact resync (CLAUDE.md's "Audio clock drift" hard risk covers
   * the same unsolved class of problem for audio; this doesn't solve it for
   * video either, just doesn't make it worse).
   */
  syncVideos(isPlaying: boolean, seconds: number): void {
    for (const video of this.videoSources.values()) {
      if (isPlaying) {
        if (video.paused) {
          void video.play().catch(() => {});
        }
        continue;
      }
      if (!video.paused) {
        video.pause();
      }
      if (Math.abs(video.currentTime - seconds) > SEEK_THRESHOLD_SECONDS) {
        video.currentTime = seconds;
      }
    }
  }

  dispose(): void {
    for (const image of this.imageSources.values()) {
      image.close();
    }
    for (const video of this.videoSources.values()) {
      video.pause();
      video.removeAttribute("src");
      video.load();
    }
    this.imageSources.clear();
    this.videoSources.clear();
    this.dimensions.clear();
    this.pending.clear();
  }

  private warm(assetId: AssetId): void {
    if (this.pending.has(assetId)) {
      return;
    }
    this.pending.add(assetId);
    this.load(assetId)
      .catch(() => {})
      .finally(() => this.pending.delete(assetId));
  }

  private async load(assetId: AssetId): Promise<void> {
    const entry = await this.assetManager.get(assetId);
    if (!entry) {
      return;
    }
    if (entry.width !== undefined && entry.height !== undefined) {
      this.dimensions.set(assetId, { width: entry.width, height: entry.height });
    }
    if (entry.type === AssetType.Image) {
      await this.loadImage(assetId, entry);
    } else if (entry.type === AssetType.Video) {
      await this.loadVideo(assetId, entry);
    }
  }

  private async loadImage(assetId: AssetId, entry: IAssetCatalogEntry): Promise<void> {
    const bytes = await this.assetManager.getBytes(assetId);
    if (!bytes) {
      return;
    }
    const bitmap = await createImageBitmap(
      new Blob([bytes as unknown as BlobPart], { type: entry.mimeType }),
    );
    this.imageSources.set(assetId, bitmap);
    this.dimensions.set(assetId, { width: bitmap.width, height: bitmap.height });
  }

  private loadVideo(assetId: AssetId, entry: IAssetCatalogEntry): Promise<void> {
    return this.assetManager.getBytes(assetId).then(
      (bytes) =>
        new Promise<void>((resolve) => {
          if (!bytes) {
            resolve();
            return;
          }
          const url = URL.createObjectURL(
            new Blob([bytes as unknown as BlobPart], { type: entry.mimeType }),
          );
          const video = document.createElement("video");
          video.muted = true;
          video.playsInline = true;
          video.preload = "auto";
          video.onloadeddata = () => {
            this.videoSources.set(assetId, video);
            this.dimensions.set(assetId, { width: video.videoWidth, height: video.videoHeight });
            resolve();
          };
          video.onerror = () => {
            URL.revokeObjectURL(url);
            resolve();
          };
          video.src = url;
        }),
    );
  }
}
