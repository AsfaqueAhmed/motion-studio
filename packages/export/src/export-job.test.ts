import {
  createCompositionId,
  ExportJobStatus,
  secondsToTicks,
  toTick,
  type IFrameState,
} from "@motion-studio/shared";
import { describe, expect, it } from "vitest";
import { AudioCodec, VideoCodec } from "./codecs";
import { runExportJob, type IExportJobDependencies } from "./export-job";
import { getExportPreset } from "./presets";
import {
  FakeCapabilityProbe,
  FakeExportAudioSource,
  FakeExportEventSink,
  FakeFrameEvaluator,
  FakeFrameRenderer,
  FakeMuxerFactory,
} from "./test-support/fakes";
import type { FakeVideoTrackSource } from "./test-support/fakes";
import { ExportPreset } from "@motion-studio/shared";

function buildFrameState(tick: number): IFrameState {
  return {
    tick: toTick(tick),
    compositionId: createCompositionId("comp-1"),
    width: 1920,
    height: 1080,
    layers: [],
  };
}

function buildDeps(overrides: Partial<IExportJobDependencies> = {}): {
  deps: IExportJobDependencies;
  muxerFactory: FakeMuxerFactory;
  events: FakeExportEventSink;
} {
  const muxerFactory = new FakeMuxerFactory();
  const events = new FakeExportEventSink();
  const deps: IExportJobDependencies = {
    evaluator: new FakeFrameEvaluator(buildFrameState),
    renderer: new FakeFrameRenderer(),
    muxerFactory,
    capabilities: new FakeCapabilityProbe({
      video: [VideoCodec.H264],
      audio: [AudioCodec.Opus],
    }),
    events,
    ...overrides,
  };
  return { deps, muxerFactory, events };
}

describe("runExportJob", () => {
  it("renders every frame, encodes video, and finalizes the muxer for a video-only job", async () => {
    const { deps, muxerFactory, events } = buildDeps();
    const preset = getExportPreset(ExportPreset.Preset1080p30H264Opus);
    const durationTicks = secondsToTicks(1, preset.fps);

    const result = await runExportJob(
      { jobId: "job-1", preset, composition: { durationTicks, fps: preset.fps } },
      deps,
    );

    expect(result.status).toBe(ExportJobStatus.Finished);
    expect(result.output).toBeInstanceOf(ArrayBuffer);

    const output = muxerFactory.outputs[0]!;
    expect(output.started).toBe(true);
    expect(output.finalized).toBe(true);
    expect(output.videoTracks[0]?.frameRate).toBe(preset.fps);
    expect(output.audioTracks).toHaveLength(0);

    const statuses = events.events.map((event) => event.type);
    expect(statuses).toContain("ExportCompleted");
    expect(statuses).not.toContain("ExportFailed");
  });

  it("adds an audio track and encodes the audio source when one is supplied", async () => {
    const audioSource = new FakeExportAudioSource(1, 48000, 2);
    const { deps, muxerFactory } = buildDeps({ audioSource });
    const preset = getExportPreset(ExportPreset.Preset1080p30H264Opus);
    const durationTicks = secondsToTicks(0.1, preset.fps);

    await runExportJob(
      { jobId: "job-2", preset, composition: { durationTicks, fps: preset.fps } },
      deps,
    );

    const output = muxerFactory.outputs[0]!;
    expect(output.audioTracks).toHaveLength(1);
  });

  it("emits ExportFailed and rejects when no supported video codec exists", async () => {
    const { deps, events } = buildDeps({
      capabilities: new FakeCapabilityProbe({ video: [], audio: [AudioCodec.Opus] }),
    });
    const preset = getExportPreset(ExportPreset.Preset1080p30H264Opus);
    const durationTicks = secondsToTicks(1, preset.fps);

    await expect(
      runExportJob(
        { jobId: "job-3", preset, composition: { durationTicks, fps: preset.fps } },
        deps,
      ),
    ).rejects.toThrow(/No supported video codec/);

    expect(events.events.some((event) => event.type === "ExportFailed")).toBe(true);
    expect(events.events.some((event) => event.type === "ExportCompleted")).toBe(false);
  });

  it("cancels before rendering starts when the signal is already aborted", async () => {
    const { deps, muxerFactory } = buildDeps();
    const preset = getExportPreset(ExportPreset.Preset1080p30H264Opus);
    const durationTicks = secondsToTicks(1, preset.fps);
    const controller = new AbortController();
    controller.abort();

    const result = await runExportJob(
      {
        jobId: "job-4",
        preset,
        composition: { durationTicks, fps: preset.fps },
        signal: controller.signal,
      },
      deps,
    );

    expect(result.status).toBe(ExportJobStatus.Cancelled);
    expect(muxerFactory.outputs[0]?.cancelled).toBe(true);
    expect(muxerFactory.outputs[0]?.finalized).toBe(false);
  });

  it("stops rendering partway through when cancelled mid-loop", async () => {
    const controller = new AbortController();
    const evaluator = new FakeFrameEvaluator((tick) => {
      if (tick > 0) {
        controller.abort();
      }
      return buildFrameState(tick);
    });
    const { deps, muxerFactory } = buildDeps({ evaluator });
    const preset = getExportPreset(ExportPreset.Preset1080p30H264Opus);
    const durationTicks = secondsToTicks(1, preset.fps);

    const result = await runExportJob(
      {
        jobId: "job-5",
        preset,
        composition: { durationTicks, fps: preset.fps },
        signal: controller.signal,
      },
      deps,
    );

    expect(result.status).toBe(ExportJobStatus.Cancelled);
    const videoTrack = muxerFactory.outputs[0]!.videoTracks[0]!.source as FakeVideoTrackSource;
    expect(videoTrack.calls.length).toBeLessThan(preset.fps);
  });
});
