import { ExportPreset } from "@motion-studio/shared";
import { describe, expect, it } from "vitest";
import { ContainerFormat, VideoCodec } from "./codecs";
import { EXPORT_PRESETS, getExportPreset } from "./presets";

describe("EXPORT_PRESETS", () => {
  it("has one concrete spec per ExportPreset enum member", () => {
    for (const id of Object.values(ExportPreset)) {
      expect(EXPORT_PRESETS[id].id).toBe(id);
    }
  });

  it("the MVP preset is 1080p30 H.264+Opus in an MP4 container (docs/24-roadmap/mvp.md Step 1)", () => {
    const preset = getExportPreset(ExportPreset.Preset1080p30H264Opus);
    expect(preset).toMatchObject({
      width: 1920,
      height: 1080,
      fps: 30,
      container: ContainerFormat.MP4,
      videoCodec: VideoCodec.H264,
    });
  });

  it("the WebM preset uses VP9 in a WebM container", () => {
    const preset = getExportPreset(ExportPreset.Preset1080p30VP9Opus);
    expect(preset.container).toBe(ContainerFormat.WebM);
    expect(preset.videoCodec).toBe(VideoCodec.VP9);
  });
});
