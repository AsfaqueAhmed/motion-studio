import { describe, expect, it } from "vitest";
import {
  AudioCodec,
  UnsupportedCodecError,
  VideoCodec,
  resolveAudioCodec,
  resolveVideoCodec,
} from "./codecs";
import { FakeCapabilityProbe } from "./test-support/fakes";

describe("resolveVideoCodec", () => {
  it("returns the preferred codec when supported", async () => {
    const probe = new FakeCapabilityProbe({ video: [VideoCodec.H264] });
    await expect(resolveVideoCodec(probe, VideoCodec.H264)).resolves.toBe(VideoCodec.H264);
  });

  it("falls back to VP9 when H.264 is unsupported", async () => {
    const probe = new FakeCapabilityProbe({ video: [VideoCodec.VP9] });
    await expect(resolveVideoCodec(probe, VideoCodec.H264)).resolves.toBe(VideoCodec.VP9);
  });

  it("falls back to H.264 when VP9 is unsupported", async () => {
    const probe = new FakeCapabilityProbe({ video: [VideoCodec.H264] });
    await expect(resolveVideoCodec(probe, VideoCodec.VP9)).resolves.toBe(VideoCodec.H264);
  });

  it("throws UnsupportedCodecError when neither is supported", async () => {
    const probe = new FakeCapabilityProbe({ video: [] });
    await expect(resolveVideoCodec(probe, VideoCodec.H264)).rejects.toThrow(UnsupportedCodecError);
  });
});

describe("resolveAudioCodec", () => {
  it("returns the preferred codec when supported", async () => {
    const probe = new FakeCapabilityProbe({ audio: [AudioCodec.AAC] });
    await expect(resolveAudioCodec(probe, AudioCodec.AAC)).resolves.toBe(AudioCodec.AAC);
  });

  it("defaults to Opus when AAC is unsupported (Firefox/Linux gap, docs/13-export/webcodecs.md)", async () => {
    const probe = new FakeCapabilityProbe({ audio: [AudioCodec.Opus] });
    await expect(resolveAudioCodec(probe, AudioCodec.AAC)).resolves.toBe(AudioCodec.Opus);
  });

  it("throws UnsupportedCodecError when neither is supported", async () => {
    const probe = new FakeCapabilityProbe({ audio: [] });
    await expect(resolveAudioCodec(probe, AudioCodec.AAC)).rejects.toThrow(UnsupportedCodecError);
  });
});
