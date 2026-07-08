import { AssetType } from "@motion-studio/shared";
import type { IThumbnailGenerator } from "@motion-studio/assets";

/**
 * Format thumbnails are encoded in — no metadata is stored alongside the raw
 * bytes (`IThumbnailStore.put` takes a bare `Uint8Array`), so producer
 * (here) and consumer (`AssetTile`) share this constant instead.
 */
export const THUMBNAIL_MIME_TYPE = "image/jpeg";

const MAX_THUMBNAIL_DIMENSION = 320;
const THUMBNAIL_QUALITY = 0.75;

/** Seconds into a video to grab the representative frame from — avoids black/title frames common at t=0. */
const VIDEO_FRAME_OFFSET_SECONDS = 1;

function fitWithin(width: number, height: number, max: number): { width: number; height: number } {
  if (width <= max && height <= max) {
    return { width, height };
  }
  const scale = max / Math.max(width, height);
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

function canvasToBytes(canvas: HTMLCanvasElement): Promise<Uint8Array | undefined> {
  return new Promise((resolve) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          resolve(undefined);
          return;
        }
        void blob.arrayBuffer().then((buffer) => resolve(new Uint8Array(buffer)));
      },
      THUMBNAIL_MIME_TYPE,
      THUMBNAIL_QUALITY,
    );
  });
}

function drawToThumbnailCanvas(
  source: CanvasImageSource,
  sourceWidth: number,
  sourceHeight: number,
): HTMLCanvasElement | undefined {
  if (sourceWidth <= 0 || sourceHeight <= 0) {
    return undefined;
  }
  const { width, height } = fitWithin(sourceWidth, sourceHeight, MAX_THUMBNAIL_DIMENSION);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) {
    return undefined;
  }
  context.drawImage(source, 0, 0, width, height);
  return canvas;
}

async function generateImageThumbnail(
  data: Uint8Array,
  mimeType: string,
): Promise<Uint8Array | undefined> {
  const bitmap = await createImageBitmap(
    new Blob([data as unknown as BlobPart], { type: mimeType }),
  );
  try {
    const canvas = drawToThumbnailCanvas(bitmap, bitmap.width, bitmap.height);
    return canvas ? await canvasToBytes(canvas) : undefined;
  } finally {
    bitmap.close();
  }
}

function generateVideoThumbnail(
  data: Uint8Array,
  mimeType: string,
): Promise<Uint8Array | undefined> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(new Blob([data as unknown as BlobPart], { type: mimeType }));
    const video = document.createElement("video");
    video.preload = "auto";
    video.muted = true;
    video.playsInline = true;

    const cleanup = (): void => {
      URL.revokeObjectURL(url);
    };

    video.onerror = () => {
      cleanup();
      reject(
        new Error(`Failed to load video for thumbnail: ${video.error?.message ?? "unknown error"}`),
      );
    };

    video.onloadeddata = () => {
      const seekTo = Math.min(VIDEO_FRAME_OFFSET_SECONDS, video.duration / 2 || 0);
      video.onseeked = () => {
        const canvas = drawToThumbnailCanvas(video, video.videoWidth, video.videoHeight);
        cleanup();
        resolve(canvas ? canvasToBytes(canvas) : Promise.resolve(undefined));
      };
      video.currentTime = seekTo;
    };

    video.src = url;
  });
}

/** Browser-API-backed `IThumbnailGenerator` — canvas frame grab, no WebCodecs. See docs/14-assets/thumbnails.md. */
export const browserThumbnailGenerator: IThumbnailGenerator = {
  generate(data: Uint8Array, type: AssetType, mimeType: string): Promise<Uint8Array | undefined> {
    switch (type) {
      case AssetType.Image:
        return generateImageThumbnail(data, mimeType);
      case AssetType.Video:
        return generateVideoThumbnail(data, mimeType);
      default:
        return Promise.resolve(undefined);
    }
  },
};
