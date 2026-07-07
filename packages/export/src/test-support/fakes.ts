import type { AppEventMap, AppEventType, IFrameState, Tick } from "@motion-studio/shared";
import type { AudioCodec, IEncodeCapabilityProbe, VideoCodec } from "../codecs";
import type {
  IAudioTrackSource,
  IExportAudioSource,
  IMuxerFactory,
  IMuxerOutput,
  IVideoTrackSource,
} from "../container";
import type { IExportEventSink } from "../export-job";
import type { IExportFrameRenderer, IFrameEvaluator } from "../frame-evaluator";

/** Always-succeeding fakes of the Export Engine's DI surface — no real browser/WebCodecs/Mediabunny exists in this package's Node test environment, matching `packages/audio/src/test-support/fake-audio-context.ts`'s approach. */

export class FakeVideoTrackSource implements IVideoTrackSource {
  readonly calls: { timestampSeconds: number; durationSeconds: number }[] = [];

  async add(timestampSeconds: number, durationSeconds: number): Promise<void> {
    this.calls.push({ timestampSeconds, durationSeconds });
  }
}

export class FakeAudioTrackSource implements IAudioTrackSource {
  readonly calls: { buffer: IExportAudioSource; timestampSeconds: number }[] = [];

  async add(buffer: IExportAudioSource, timestampSeconds: number): Promise<void> {
    this.calls.push({ buffer, timestampSeconds });
  }
}

export class FakeMuxerOutput implements IMuxerOutput {
  readonly videoTracks: { source: IVideoTrackSource; frameRate: number }[] = [];
  readonly audioTracks: IAudioTrackSource[] = [];
  started = false;
  finalized = false;
  cancelled = false;

  addVideoTrack(source: IVideoTrackSource, options: { frameRate: number }): void {
    this.videoTracks.push({ source, frameRate: options.frameRate });
  }

  addAudioTrack(source: IAudioTrackSource): void {
    this.audioTracks.push(source);
  }

  async start(): Promise<void> {
    this.started = true;
  }

  async finalize(): Promise<ArrayBuffer> {
    this.finalized = true;
    return new ArrayBuffer(0);
  }

  async cancel(): Promise<void> {
    this.cancelled = true;
  }
}

export class FakeMuxerFactory implements IMuxerFactory {
  readonly outputs: FakeMuxerOutput[] = [];

  createOutput(): IMuxerOutput {
    const output = new FakeMuxerOutput();
    this.outputs.push(output);
    return output;
  }

  createVideoTrackSource(): IVideoTrackSource {
    return new FakeVideoTrackSource();
  }

  createAudioTrackSource(): IAudioTrackSource {
    return new FakeAudioTrackSource();
  }
}

export interface IFakeCapabilityOptions {
  readonly video?: readonly VideoCodec[];
  readonly audio?: readonly AudioCodec[];
}

export class FakeCapabilityProbe implements IEncodeCapabilityProbe {
  private readonly video: Set<VideoCodec>;
  private readonly audio: Set<AudioCodec>;

  constructor(options: IFakeCapabilityOptions = {}) {
    this.video = new Set(options.video ?? []);
    this.audio = new Set(options.audio ?? []);
  }

  async canEncodeVideo(codec: VideoCodec): Promise<boolean> {
    return this.video.has(codec);
  }

  async canEncodeAudio(codec: AudioCodec): Promise<boolean> {
    return this.audio.has(codec);
  }
}

export class FakeFrameEvaluator implements IFrameEvaluator {
  readonly evaluatedTicks: Tick[] = [];

  constructor(private readonly build: (tick: Tick) => IFrameState) {}

  evaluate(tick: Tick): IFrameState {
    this.evaluatedTicks.push(tick);
    return this.build(tick);
  }
}

export class FakeFrameRenderer implements IExportFrameRenderer {
  readonly rendered: IFrameState[] = [];

  renderFrame(frameState: IFrameState): void {
    this.rendered.push(frameState);
  }
}

export class FakeExportAudioSource implements IExportAudioSource {
  constructor(
    readonly duration: number,
    readonly sampleRate: number,
    readonly numberOfChannels: number,
  ) {}

  getChannelData(channel: number): Float32Array {
    return new Float32Array(Math.round(this.duration * this.sampleRate)).fill(channel);
  }
}

export class FakeExportEventSink implements IExportEventSink {
  readonly events: { type: AppEventType; payload: unknown }[] = [];

  emit<T extends AppEventType>(type: T, payload: AppEventMap[T]): void {
    this.events.push({ type, payload });
  }
}
