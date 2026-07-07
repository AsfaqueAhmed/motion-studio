import type { AssetType, Tick } from "@motion-studio/shared";

/** Per-type metadata schemas — PLAN.md Phase 12, `docs/14-assets/metadata.md`. */
export interface IVideoMetadata {
  readonly type: AssetType.Video;
  readonly width: number;
  readonly height: number;
  readonly durationTicks: Tick;
  readonly fps: number;
  readonly hasAudio: boolean;
}

export interface IImageMetadata {
  readonly type: AssetType.Image;
  readonly width: number;
  readonly height: number;
}

export interface IAudioMetadata {
  readonly type: AssetType.Audio;
  readonly durationTicks: Tick;
  readonly sampleRate: number;
  readonly numberOfChannels: number;
}

export interface IFontMetadata {
  readonly type: AssetType.Font;
  readonly family: string;
}

/** `size` is the cube edge length (e.g. 33 for a 33x33x33 `.cube` LUT). */
export interface ILUTMetadata {
  readonly type: AssetType.LUT;
  readonly size: number;
}

export type IAssetMetadata =
  IVideoMetadata | IImageMetadata | IAudioMetadata | IFontMetadata | ILUTMetadata;

/**
 * Decode-and-inspect step of the import pipeline
 * (`docs/14-assets/importer.md`). No real decoder wired yet — same
 * "engine exists, integration is later" gap as Rendering/Effects/Audio's
 * backend DI.
 */
export interface IMetadataExtractor {
  extract(data: Uint8Array, type: AssetType, mimeType: string): Promise<IAssetMetadata>;
}
