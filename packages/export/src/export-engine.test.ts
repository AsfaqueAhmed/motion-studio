import {
  createCompositionId,
  ExportJobStatus,
  ExportPreset,
  secondsToTicks,
  toTick,
  type IFrameState,
} from "@motion-studio/shared";
import { describe, expect, it } from "vitest";
import { AudioCodec, VideoCodec } from "./codecs";
import { ExportEngine } from "./export-engine";
import type { IExportJobDependencies } from "./export-job";
import { getExportPreset } from "./presets";
import {
  FakeCapabilityProbe,
  FakeExportEventSink,
  FakeFrameEvaluator,
  FakeFrameRenderer,
  FakeMuxerFactory,
} from "./test-support/fakes";

function buildFrameState(tick: number): IFrameState {
  return {
    tick: toTick(tick),
    compositionId: createCompositionId("comp-1"),
    width: 1920,
    height: 1080,
    layers: [],
  };
}

function buildDeps(evaluator = new FakeFrameEvaluator(buildFrameState)): {
  deps: IExportJobDependencies;
  events: FakeExportEventSink;
} {
  const events = new FakeExportEventSink();
  return {
    deps: {
      evaluator,
      renderer: new FakeFrameRenderer(),
      muxerFactory: new FakeMuxerFactory(),
      capabilities: new FakeCapabilityProbe({
        video: [VideoCodec.H264],
        audio: [AudioCodec.Opus],
      }),
      events,
    },
    events,
  };
}

describe("ExportEngine", () => {
  it("follows the standard IEngine lifecycle without throwing", async () => {
    const engine = new ExportEngine();
    expect(engine.name).toBe("Export");
    await engine.initialize();
    await engine.ready();
    await engine.dispose();
  });

  it("emits Queued before Preparing, then runs the job to completion", async () => {
    const engine = new ExportEngine();
    const { deps, events } = buildDeps();
    const preset = getExportPreset(ExportPreset.Preset1080p30H264Opus);
    const durationTicks = secondsToTicks(0.5, preset.fps);

    const result = await engine.run(
      { jobId: "job-1", preset, composition: { durationTicks, fps: preset.fps } },
      deps,
    );

    expect(result.status).toBe(ExportJobStatus.Finished);
    const statuses = events.events
      .filter((event) => event.type === "ExportProgressed")
      .map((event) => (event.payload as { status: ExportJobStatus }).status);
    expect(statuses[0]).toBe(ExportJobStatus.Queued);
    expect(engine.isRunning("job-1")).toBe(false);
  });

  it("rejects starting a second job with the same jobId while one is running", async () => {
    const engine = new ExportEngine();
    const { deps } = buildDeps();
    const preset = getExportPreset(ExportPreset.Preset1080p30H264Opus);
    const durationTicks = secondsToTicks(0.1, preset.fps);

    // `run`'s synchronous prefix (the duplicate-jobId guard) executes
    // before this expression yields control back here, so the guard is
    // already armed by the time the second call is made on the next line.
    const firstRun = engine.run(
      { jobId: "dup", preset, composition: { durationTicks, fps: preset.fps } },
      deps,
    );

    await expect(
      engine.run({ jobId: "dup", preset, composition: { durationTicks, fps: preset.fps } }, deps),
    ).rejects.toThrow(/already running/);

    await firstRun;
  });

  it("cancel(jobId) aborts an in-flight job", async () => {
    const engine = new ExportEngine();
    let controllerAborted = false;
    const evaluator = new FakeFrameEvaluator((tick) => {
      if (tick > 0 && !controllerAborted) {
        controllerAborted = true;
        engine.cancel("job-cancel");
      }
      return buildFrameState(tick);
    });
    const { deps } = buildDeps(evaluator);
    const preset = getExportPreset(ExportPreset.Preset1080p30H264Opus);
    const durationTicks = secondsToTicks(1, preset.fps);

    const result = await engine.run(
      { jobId: "job-cancel", preset, composition: { durationTicks, fps: preset.fps } },
      deps,
    );

    expect(result.status).toBe(ExportJobStatus.Cancelled);
  });

  it("dispose aborts every in-flight job", async () => {
    const engine = new ExportEngine();
    const evaluator = new FakeFrameEvaluator((tick) => {
      if (tick === 0) {
        engine.dispose();
      }
      return buildFrameState(tick);
    });
    const { deps } = buildDeps(evaluator);
    const preset = getExportPreset(ExportPreset.Preset1080p30H264Opus);
    const durationTicks = secondsToTicks(1, preset.fps);

    const result = await engine.run(
      { jobId: "job-dispose", preset, composition: { durationTicks, fps: preset.fps } },
      deps,
    );

    expect(result.status).toBe(ExportJobStatus.Cancelled);
  });
});
