import { AssetType, secondsToTicks } from "@motion-studio/shared";
import type { IAssetMetadata, IMetadataExtractor } from "@motion-studio/assets";

/**
 * No real decoder pipeline exists anywhere in the project yet (flagged since
 * Phase 12's `IMetadataExtractor` doc comment) — this is a browser-API-only
 * implementation, not a WebCodecs/demuxer-backed one. Video/audio duration
 * comes from letting the browser's own `<video>`/`<audio>` element or
 * `AudioContext.decodeAudioData` load the file, not from parsing the
 * container ourselves.
 *
 * Asset-native `durationTicks` is computed at a fixed 30fps regardless of
 * the source's real frame rate — there's no "project fps" in scope at
 * import time, only once the asset lands on a Timeline. Whoever creates a
 * `TrackItem` for this asset should re-derive `durationTicks` against the
 * destination Composition's own fps rather than reusing this value as-is
 * when the two differ.
 */
const ASSET_METADATA_FPS = 30;

function readImageMetadata(data: Uint8Array, mimeType: string): Promise<IAssetMetadata> {
  return createImageBitmap(new Blob([data as unknown as BlobPart], { type: mimeType })).then(
    (bitmap) => {
      const metadata: IAssetMetadata = {
        type: AssetType.Image,
        width: bitmap.width,
        height: bitmap.height,
      };
      bitmap.close();
      return metadata;
    },
  );
}

function readVideoMetadata(data: Uint8Array, mimeType: string): Promise<IAssetMetadata> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(new Blob([data as unknown as BlobPart], { type: mimeType }));
    const video = document.createElement("video");
    video.preload = "metadata";
    video.onloadedmetadata = () => {
      const metadata: IAssetMetadata = {
        type: AssetType.Video,
        width: video.videoWidth,
        height: video.videoHeight,
        durationTicks: secondsToTicks(video.duration, ASSET_METADATA_FPS),
        fps: ASSET_METADATA_FPS,
        // No cross-browser way to detect an audio track without decoding
        // elementary streams (WebCodecs demuxing, out of scope) — assumed
        // present. Harmless today since no waveform generator is wired.
        hasAudio: true,
      };
      URL.revokeObjectURL(url);
      resolve(metadata);
    };
    video.onerror = () => {
      URL.revokeObjectURL(url);
      reject(
        new Error(`Failed to read video metadata: ${video.error?.message ?? "unknown error"}`),
      );
    };
    video.src = url;
  });
}

async function readAudioMetadata(data: Uint8Array): Promise<IAssetMetadata> {
  const context = new AudioContext();
  try {
    const buffer = await context.decodeAudioData(data.slice().buffer as ArrayBuffer);
    return {
      type: AssetType.Audio,
      durationTicks: secondsToTicks(buffer.duration, ASSET_METADATA_FPS),
      sampleRate: buffer.sampleRate,
      numberOfChannels: buffer.numberOfChannels,
    };
  } finally {
    await context.close();
  }
}

/**
 * Reads the family name straight out of the SFNT `name` table (nameID 1),
 * preferring a Windows/UTF-16BE record, falling back to Mac/ASCII. Only
 * works for raw TTF/OTF bytes — WOFF/WOFF2 wrap the same tables in
 * zlib/brotli compression, which would need a real decompression
 * dependency to unpack, so those report "Unknown" rather than guessing.
 */
function readFontMetadata(data: Uint8Array): IAssetMetadata {
  const family = parseSfntFamilyName(data) ?? "Unknown";
  return { type: AssetType.Font, family };
}

const SFNT_TAGS = new Set([0x00010000, 0x4f54544f /* "OTTO" */, 0x74727565 /* "true" */]);

function parseSfntFamilyName(data: Uint8Array): string | undefined {
  if (data.byteLength < 12) {
    return undefined;
  }
  const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
  if (!SFNT_TAGS.has(view.getUint32(0))) {
    return undefined;
  }
  const numTables = view.getUint16(4);
  let nameTableOffset: number | undefined;
  for (let i = 0; i < numTables; i++) {
    const recordOffset = 12 + i * 16;
    if (recordOffset + 16 > data.byteLength) {
      break;
    }
    const tag = view.getUint32(recordOffset);
    if (tag === 0x6e616d65 /* "name" */) {
      nameTableOffset = view.getUint32(recordOffset + 8);
      break;
    }
  }
  if (nameTableOffset === undefined) {
    return undefined;
  }

  const count = view.getUint16(nameTableOffset + 2);
  const stringAreaOffset = nameTableOffset + view.getUint16(nameTableOffset + 4);
  let macRecord: { offset: number; length: number } | undefined;
  for (let i = 0; i < count; i++) {
    const recordOffset = nameTableOffset + 6 + i * 12;
    const platformId = view.getUint16(recordOffset);
    const nameId = view.getUint16(recordOffset + 6);
    if (nameId !== 1) {
      continue;
    }
    const length = view.getUint16(recordOffset + 8);
    const offset = stringAreaOffset + view.getUint16(recordOffset + 10);
    if (platformId === 3) {
      return new TextDecoder("utf-16be").decode(data.slice(offset, offset + length));
    }
    if (platformId === 1) {
      macRecord = { offset, length };
    }
  }
  return macRecord
    ? new TextDecoder("ascii").decode(
        data.slice(macRecord.offset, macRecord.offset + macRecord.length),
      )
    : undefined;
}

/** Minimal `.cube` header parse for `LUT_3D_SIZE` — no other LUT container is supported yet. */
function readLutMetadata(data: Uint8Array): IAssetMetadata {
  const text = new TextDecoder().decode(data.slice(0, 4096));
  const match = /LUT_3D_SIZE\s+(\d+)/.exec(text);
  return { type: AssetType.LUT, size: match ? Number(match[1]) : 0 };
}

/** Browser-API-backed `IMetadataExtractor` — see module doc comment for what's real vs. approximated. */
export const browserMetadataExtractor: IMetadataExtractor = {
  extract(data: Uint8Array, type: AssetType, mimeType: string): Promise<IAssetMetadata> {
    switch (type) {
      case AssetType.Image:
        return readImageMetadata(data, mimeType);
      case AssetType.Video:
        return readVideoMetadata(data, mimeType);
      case AssetType.Audio:
        return readAudioMetadata(data);
      case AssetType.Font:
        return Promise.resolve(readFontMetadata(data));
      case AssetType.LUT:
        return Promise.resolve(readLutMetadata(data));
    }
  },
};
