import { AssetType } from "@motion-studio/shared";
import { describe, expect, it } from "vitest";
import { detectAssetType } from "./supported-types";

describe("detectAssetType", () => {
  it("detects by extension for every PLAN.md Phase 12 supported type", () => {
    expect(detectAssetType("clip.mp4", "")).toBe(AssetType.Video);
    expect(detectAssetType("clip.mov", "")).toBe(AssetType.Video);
    expect(detectAssetType("clip.webm", "")).toBe(AssetType.Video);
    expect(detectAssetType("song.mp3", "")).toBe(AssetType.Audio);
    expect(detectAssetType("song.wav", "")).toBe(AssetType.Audio);
    expect(detectAssetType("song.ogg", "")).toBe(AssetType.Audio);
    expect(detectAssetType("photo.png", "")).toBe(AssetType.Image);
    expect(detectAssetType("photo.jpg", "")).toBe(AssetType.Image);
    expect(detectAssetType("photo.jpeg", "")).toBe(AssetType.Image);
    expect(detectAssetType("photo.webp", "")).toBe(AssetType.Image);
    expect(detectAssetType("icon.svg", "")).toBe(AssetType.Image);
    expect(detectAssetType("anim.gif", "")).toBe(AssetType.Image);
    expect(detectAssetType("font.ttf", "")).toBe(AssetType.Font);
    expect(detectAssetType("font.otf", "")).toBe(AssetType.Font);
    expect(detectAssetType("font.woff", "")).toBe(AssetType.Font);
    expect(detectAssetType("font.woff2", "")).toBe(AssetType.Font);
    expect(detectAssetType("look.cube", "")).toBe(AssetType.LUT);
  });

  it("is case-insensitive on extension", () => {
    expect(detectAssetType("CLIP.MP4", "")).toBe(AssetType.Video);
  });

  it("falls back to MIME type when the extension is unknown", () => {
    expect(detectAssetType("blob", "image/png")).toBe(AssetType.Image);
    expect(detectAssetType("blob", "video/quicktime")).toBe(AssetType.Video);
  });

  it("prefers extension over a conflicting MIME type", () => {
    expect(detectAssetType("clip.mp4", "application/octet-stream")).toBe(AssetType.Video);
  });

  it("returns undefined for unsupported types", () => {
    expect(detectAssetType("archive.zip", "application/zip")).toBeUndefined();
  });
});
