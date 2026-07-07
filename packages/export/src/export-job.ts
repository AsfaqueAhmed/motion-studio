import {
  ExportJobStatus,
  type AppEventMap,
  type AppEventType,
  type Tick,
} from "@motion-studio/shared";
import { resolveAudioCodec, resolveVideoCodec, type IEncodeCapabilityProbe } from "./codecs";
import type {
  IAudioTrackSource,
  IExportAudioSource,
  IMuxerFactory,
  IMuxerOutput,
} from "./container";
import {
  computeExportFrames,
  type IExportFrameRenderer,
  type IFrameEvaluator,
} from "./frame-evaluator";
import type { IExportPreset } from "./presets";

/**
 * Same generic shape as `packages/core/src/event-bus.ts`'s `EventBus.emit`
 * — a real `EventBus` instance satisfies this structurally, no adapter
 * needed, matching how `AudioEngine.attachRealtimeContext` takes a plain
 * `IAudioContext` rather than importing Core.
 */
export interface IExportEventSink {
  emit<T extends AppEventType>(type: T, payload: AppEventMap[T]): void;
}

export interface IExportJobConfig {
  readonly jobId: string;
  readonly preset: IExportPreset;
  readonly composition: { readonly durationTicks: Tick; readonly fps: number };
  readonly tickResolution?: number;
  readonly signal?: AbortSignal;
}

export interface IExportJobDependencies {
  readonly evaluator: IFrameEvaluator;
  readonly renderer: IExportFrameRenderer;
  readonly muxerFactory: IMuxerFactory;
  readonly capabilities: IEncodeCapabilityProbe;
  readonly audioSource?: IExportAudioSource;
  readonly events?: IExportEventSink;
}

export interface IExportJobResult {
  readonly jobId: string;
  readonly status: ExportJobStatus.Finished | ExportJobStatus.Cancelled;
  readonly output?: ArrayBuffer;
}

/**
 * Drives one export job through the state machine in
 * `docs/13-export/overview.md`: Preparing (capability resolution + muxer
 * setup) -> Rendering (per-frame evaluate+draw+encode, fused because
 * Mediabunny's track `add()` call *is* the encode step, per `container.ts`)
 * -> Encoding (bulk audio) -> Muxing (finalize) -> Finished. Never buffers
 * more than one frame at a time (PLAN.md Phase 10: "never buffer every
 * frame in memory") — each video frame is hashed into the muxer as soon as
 * it's rendered. Cancellation (`config.signal`) is checked before Preparing
 * commits and before every frame, matching "cancellation is safe at any
 * stage."
 */
export async function runExportJob(
  config: IExportJobConfig,
  deps: IExportJobDependencies,
): Promise<IExportJobResult> {
  const { jobId, preset, composition, signal } = config;

  const emit = (status: ExportJobStatus, progress: number): void => {
    deps.events?.emit("ExportProgressed", { jobId, status, progress });
  };

  try {
    emit(ExportJobStatus.Preparing, 0);

    const videoCodec = await resolveVideoCodec(deps.capabilities, preset.videoCodec);
    const audioCodec = deps.audioSource
      ? await resolveAudioCodec(deps.capabilities, preset.audioCodec)
      : undefined;
    void videoCodec; // codec choice informs the host's real encoder construction; nothing left to do with it here

    const output = deps.muxerFactory.createOutput();
    const videoTrack = deps.muxerFactory.createVideoTrackSource();
    output.addVideoTrack(videoTrack, { frameRate: preset.fps });

    let audioTrack: IAudioTrackSource | undefined;
    if (deps.audioSource && audioCodec) {
      audioTrack = deps.muxerFactory.createAudioTrackSource();
      output.addAudioTrack(audioTrack);
    }

    await output.start();

    if (signal?.aborted) {
      return await cancelJob(output, jobId, emit);
    }

    emit(ExportJobStatus.Rendering, 0);
    const frames = computeExportFrames(
      composition.durationTicks,
      composition.fps,
      preset.fps,
      config.tickResolution,
    );

    for (const [index, frame] of frames.entries()) {
      if (signal?.aborted) {
        return await cancelJob(output, jobId, emit);
      }
      const frameState = await deps.evaluator.evaluate(frame.tick);
      await deps.renderer.renderFrame(frameState);
      await videoTrack.add(frame.timestampSeconds, frame.durationSeconds);
      emit(ExportJobStatus.Rendering, (index + 1) / frames.length);
    }

    if (audioTrack && deps.audioSource) {
      emit(ExportJobStatus.Encoding, 0);
      await audioTrack.add(deps.audioSource, 0);
      emit(ExportJobStatus.Encoding, 1);
    }

    emit(ExportJobStatus.Muxing, 0);
    const bytes = await output.finalize();
    emit(ExportJobStatus.Muxing, 1);

    deps.events?.emit("ExportCompleted", { jobId });
    return { jobId, status: ExportJobStatus.Finished, output: bytes };
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    deps.events?.emit("ExportFailed", { jobId, reason });
    throw error;
  }
}

async function cancelJob(
  output: IMuxerOutput,
  jobId: string,
  emit: (status: ExportJobStatus, progress: number) => void,
): Promise<IExportJobResult> {
  await output.cancel?.();
  emit(ExportJobStatus.Cancelled, 0);
  return { jobId, status: ExportJobStatus.Cancelled };
}
