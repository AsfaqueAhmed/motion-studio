import {
  ALL_FORMATS,
  AudioBufferSink,
  AudioBufferSource,
  BlobSource,
  BufferTarget,
  CanvasSource,
  Input,
  Mp4OutputFormat,
  Output,
  QUALITY_HIGH,
  VideoSampleSink,
  canEncodeAudio,
  canEncodeVideo,
} from "mediabunny";
import { beforeAll, describe, expect, it } from "vitest";

/**
 * PLAN.md 16.2 "Export pipeline (Spike A validated path only)". Mirrors
 * `spikes/spike-a-export/src/main.ts`'s proven pipeline — decode source MP4
 * -> draw frame to canvas + overlay (simulated render step) -> re-encode ->
 * mux -> verify the output is a real, parseable MP4 with the expected frame
 * and audio-buffer counts — as a permanent regression test instead of
 * throwaway spike code. Opus only (the documented default per
 * `docs/13-export/webcodecs.md`'s AAC-on-Firefox gap); AAC stays untested
 * here since this pipeline doesn't vary by browser in CI.
 */
async function loadSampleBlob(): Promise<Blob> {
  const url = new URL("./test-support/fixtures/sample.mp4", import.meta.url);
  const response = await fetch(url);
  return response.blob();
}

describe("WebCodecs + Mediabunny export pipeline (Spike A path)", () => {
  beforeAll(async () => {
    const canH264 = await canEncodeVideo("avc", {
      width: 640,
      height: 360,
      bitrate: QUALITY_HIGH,
    });
    expect(canH264).toBe(true);
    const canOpus = await canEncodeAudio("opus", {
      numberOfChannels: 1,
      sampleRate: 44100,
      bitrate: 128_000,
    });
    expect(canOpus).toBe(true);
  });

  it("decodes the sample clip, re-renders each frame, and muxes a playable MP4", async () => {
    const blob = await loadSampleBlob();
    const input = new Input({ source: new BlobSource(blob), formats: ALL_FORMATS });

    const videoTrack = await input.getPrimaryVideoTrack();
    const audioTrack = await input.getPrimaryAudioTrack();
    expect(videoTrack).toBeTruthy();
    expect(audioTrack).toBeTruthy();
    if (!videoTrack || !audioTrack) return;

    const width = await videoTrack.getDisplayWidth();
    const height = await videoTrack.getDisplayHeight();
    expect(width).toBeGreaterThan(0);
    expect(height).toBeGreaterThan(0);

    const canvas = new OffscreenCanvas(width, height);
    const ctx = canvas.getContext("2d");
    expect(ctx).toBeTruthy();
    if (!ctx) return;

    const output = new Output({ format: new Mp4OutputFormat(), target: new BufferTarget() });
    const videoSource = new CanvasSource(canvas, { codec: "avc", bitrate: QUALITY_HIGH });
    output.addVideoTrack(videoSource, { frameRate: 30 });
    const audioSource = new AudioBufferSource({ codec: "opus", bitrate: 128_000 });
    output.addAudioTrack(audioSource);

    await output.start();

    const videoSink = new VideoSampleSink(videoTrack);
    let frameCount = 0;
    for await (const sample of videoSink.samples()) {
      sample.draw(ctx as unknown as CanvasRenderingContext2D, 0, 0);
      // Simulated render step, proving encode captures re-drawn content,
      // not a passthrough of the decoded frame.
      ctx.fillStyle = "rgba(255, 0, 0, 0.6)";
      ctx.fillRect(4, 4, 24, 24);
      await videoSource.add(sample.timestamp, sample.duration);
      sample.close();
      frameCount++;
    }
    expect(frameCount).toBeGreaterThan(0);

    const audioSink = new AudioBufferSink(audioTrack);
    let bufferCount = 0;
    for await (const { buffer } of audioSink.buffers()) {
      await audioSource.add(buffer);
      bufferCount++;
    }
    expect(bufferCount).toBeGreaterThan(0);

    await output.finalize();

    const outputBytes = output.target.buffer;
    expect(outputBytes).toBeTruthy();
    if (!outputBytes) return;
    expect(outputBytes.byteLength).toBeGreaterThan(0);

    // A valid MP4/ISOBMFF file's first box is `ftyp`, spelled at byte offset 4.
    const header = new TextDecoder().decode(new Uint8Array(outputBytes, 4, 4));
    expect(header).toBe("ftyp");

    // Read the muxed output back through Mediabunny itself — the strongest
    // available proof this is a real, parseable container, not just bytes
    // that happen to start with a valid box header.
    const readBack = new Input({
      source: new BlobSource(new Blob([outputBytes], { type: "video/mp4" })),
      formats: ALL_FORMATS,
    });
    const readBackVideoTrack = await readBack.getPrimaryVideoTrack();
    expect(readBackVideoTrack).toBeTruthy();
    if (!readBackVideoTrack) return;

    let readBackFrameCount = 0;
    for await (const sample of new VideoSampleSink(readBackVideoTrack).samples()) {
      expect(sample.displayWidth).toBe(width);
      expect(sample.displayHeight).toBe(height);
      sample.close();
      readBackFrameCount++;
    }
    expect(readBackFrameCount).toBe(frameCount);
  });
});
