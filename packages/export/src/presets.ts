import { ExportPreset } from "@motion-studio/shared";
import { AudioCodec, ContainerFormat, VideoCodec } from "./codecs";

/**
 * Concrete spec behind each `ExportPreset` id — target dimensions/fps are
 * independent of the source Composition's own dimensions/fps (a 4K project
 * can still export at 720p). Resampling from source to target fps is
 * `frame-evaluator.ts`'s job, not the preset's.
 */
export interface IExportPreset {
  readonly id: ExportPreset;
  readonly label: string;
  readonly width: number;
  readonly height: number;
  readonly fps: number;
  readonly container: ContainerFormat;
  readonly videoCodec: VideoCodec;
  readonly audioCodec: AudioCodec;
  readonly videoBitrate: number;
  readonly audioBitrate: number;
}

/**
 * `docs/13-export/export-presets.md`. Only MP4/H.264+Opus variants plus one
 * WebM/VP9+Opus preset ship here — see `codecs.ts` for why GIF isn't among
 * them at all.
 */
export const EXPORT_PRESETS: Readonly<Record<ExportPreset, IExportPreset>> = {
  [ExportPreset.Preset720p30H264Opus]: {
    id: ExportPreset.Preset720p30H264Opus,
    label: "720p30 (H.264 + Opus)",
    width: 1280,
    height: 720,
    fps: 30,
    container: ContainerFormat.MP4,
    videoCodec: VideoCodec.H264,
    audioCodec: AudioCodec.Opus,
    videoBitrate: 5_000_000,
    audioBitrate: 128_000,
  },
  [ExportPreset.Preset1080p30H264Opus]: {
    id: ExportPreset.Preset1080p30H264Opus,
    label: "1080p30 (H.264 + Opus)",
    width: 1920,
    height: 1080,
    fps: 30,
    container: ContainerFormat.MP4,
    videoCodec: VideoCodec.H264,
    audioCodec: AudioCodec.Opus,
    videoBitrate: 10_000_000,
    audioBitrate: 128_000,
  },
  [ExportPreset.Preset4K30H264Opus]: {
    id: ExportPreset.Preset4K30H264Opus,
    label: "4K30 (H.264 + Opus)",
    width: 3840,
    height: 2160,
    fps: 30,
    container: ContainerFormat.MP4,
    videoCodec: VideoCodec.H264,
    audioCodec: AudioCodec.Opus,
    videoBitrate: 35_000_000,
    audioBitrate: 192_000,
  },
  [ExportPreset.Preset1080p30VP9Opus]: {
    id: ExportPreset.Preset1080p30VP9Opus,
    label: "1080p30 (VP9 + Opus, WebM)",
    width: 1920,
    height: 1080,
    fps: 30,
    container: ContainerFormat.WebM,
    videoCodec: VideoCodec.VP9,
    audioCodec: AudioCodec.Opus,
    videoBitrate: 8_000_000,
    audioBitrate: 128_000,
  },
};

export function getExportPreset(id: ExportPreset): IExportPreset {
  return EXPORT_PRESETS[id];
}
