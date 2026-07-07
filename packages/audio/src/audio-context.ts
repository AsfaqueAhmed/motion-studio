/**
 * Minimal, hand-rolled subset of the Web Audio API this package actually
 * calls — kept independent of lib.dom's full `AudioContext`/
 * `OfflineAudioContext` interfaces so tests can inject a fake without a
 * real browser audio device, matching the dependency-injection pattern
 * `packages/rendering/src/render-backend.ts` and
 * `packages/rendering/src/canvas2d-backend.ts` use for their own
 * browser-only APIs (`ICanvas2DContext`, `IGPUDevice`).
 *
 * `IAudioContext` is the common surface a real `AudioContext` and a real
 * `OfflineAudioContext` both structurally satisfy — this is what makes
 * "preview and export use the exact same processing graph" achievable
 * (`docs/10-audio-engine/overview.md`): every function in this package
 * that builds a graph takes an `IAudioContext`, never the concrete
 * browser type, so `audio-graph.ts`/`mixer.ts`/`effects.ts` run unmodified
 * against either.
 */
export interface IAudioParam {
  value: number;
  setValueAtTime(value: number, startTime: number): IAudioParam;
  linearRampToValueAtTime(value: number, endTime: number): IAudioParam;
  cancelScheduledValues(startTime: number): IAudioParam;
}

export interface IAudioNode {
  connect(destination: IAudioNode): IAudioNode;
  disconnect(destination?: IAudioNode): void;
}

export interface IGainNode extends IAudioNode {
  readonly gain: IAudioParam;
}

export interface IStereoPannerNode extends IAudioNode {
  readonly pan: IAudioParam;
}

export interface IBiquadFilterNode extends IAudioNode {
  type: string;
  readonly frequency: IAudioParam;
  readonly Q: IAudioParam;
  readonly gain: IAudioParam;
}

export interface IDynamicsCompressorNode extends IAudioNode {
  readonly threshold: IAudioParam;
  readonly knee: IAudioParam;
  readonly ratio: IAudioParam;
  readonly attack: IAudioParam;
  readonly release: IAudioParam;
}

export interface IDelayNode extends IAudioNode {
  readonly delayTime: IAudioParam;
}

export interface IConvolverNode extends IAudioNode {
  buffer: IAudioBuffer | null;
  normalize: boolean;
}

/** Decoded PCM data. Matches the fields this package's DSP actually reads off a real `AudioBuffer`. */
export interface IAudioBuffer {
  readonly duration: number;
  readonly numberOfChannels: number;
  readonly sampleRate: number;
}

export interface IAudioBufferSourceNode extends IAudioNode {
  buffer: IAudioBuffer | null;
  loop: boolean;
  readonly playbackRate: IAudioParam;
  onended: (() => void) | null;
  start(when?: number, offset?: number, duration?: number): void;
  stop(when?: number): void;
}

export type IAudioDestinationNode = IAudioNode;

export interface IAudioContext {
  readonly currentTime: number;
  readonly sampleRate: number;
  readonly destination: IAudioDestinationNode;
  createGain(): IGainNode;
  createStereoPanner(): IStereoPannerNode;
  createBiquadFilter(): IBiquadFilterNode;
  createDynamicsCompressor(): IDynamicsCompressorNode;
  createDelay(maxDelayTime?: number): IDelayNode;
  createConvolver(): IConvolverNode;
  createBufferSource(): IAudioBufferSourceNode;
}

/**
 * Export render path (9.2, `docs/10-audio-engine/overview.md`
 * "Preview vs. export"). `OfflineAudioContext` renders as fast as
 * possible rather than in realtime — the graph-construction code is
 * identical, only `startRendering()` and the resulting buffer differ.
 */
export interface IOfflineAudioContext extends IAudioContext {
  startRendering(): Promise<IAudioBuffer>;
}

export interface IAudioWorkletParameterMap {
  get(name: string): IAudioParam | undefined;
}

export interface IAudioWorkletNode extends IAudioNode {
  readonly parameters: IAudioWorkletParameterMap;
}

export interface IAudioWorkletNodeOptions {
  readonly processorOptions?: Record<string, unknown>;
}

/**
 * The subset of `AudioContext`/`OfflineAudioContext` needed to register
 * and instantiate an `AudioWorkletNode` — split out from `IAudioContext`
 * because most graph code (`audio-graph.ts`, `mixer.ts`, native nodes in
 * `effects.ts`) never touches AudioWorklet at all.
 */
export interface IAudioWorkletContext extends IAudioContext {
  readonly audioWorklet: { addModule(moduleUrl: string): Promise<void> };
  createAudioWorkletNode(
    processorName: string,
    options?: IAudioWorkletNodeOptions,
  ): IAudioWorkletNode;
}
