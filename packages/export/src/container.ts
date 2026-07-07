/**
 * Minimal, hand-rolled subset of Mediabunny's container read/write surface
 * this package actually calls (`docs/13-export/muxer.md`, ADR-012) — kept
 * independent of the real `mediabunny` package so tests can inject a fake
 * without a real browser/WebCodecs environment, matching the DI pattern
 * `packages/audio/src/audio-context.ts` uses for Web Audio and
 * `packages/rendering/src/canvas2d-backend.ts` uses for `CanvasRenderingContext2D`.
 * A real adapter (`new Output(...)`, `new CanvasSource(...)`,
 * `new AudioBufferSource(...)`) satisfies these interfaces structurally —
 * see the API shape confirmed in `muxer.md`.
 */

/** Mediabunny's `CanvasSource`/`VideoSampleSource`: captures a drawable at `add()` time. */
export interface IVideoTrackSource {
  add(timestampSeconds: number, durationSeconds: number): Promise<void>;
}

/** The minimal PCM shape Mediabunny's `AudioBufferSource` (and a real `AudioBuffer`) both satisfy. */
export interface IExportAudioSource {
  readonly duration: number;
  readonly sampleRate: number;
  readonly numberOfChannels: number;
  getChannelData(channel: number): Float32Array;
}

/** Mediabunny's `AudioBufferSource`. */
export interface IAudioTrackSource {
  add(buffer: IExportAudioSource, timestampSeconds: number): Promise<void>;
}

export interface IMuxerOutput {
  addVideoTrack(source: IVideoTrackSource, options: { frameRate: number }): void;
  addAudioTrack(source: IAudioTrackSource): void;
  start(): Promise<void>;
  /** Flushes and closes the container, returning the final file bytes. */
  finalize(): Promise<ArrayBuffer>;
  /** Not every muxer implementation supports aborting mid-write; safe to no-op. */
  cancel?(): Promise<void>;
}

/**
 * Host-supplied factory — only the host has the real canvas/WebCodecs
 * globals to construct a real Mediabunny `Output`/`CanvasSource`/
 * `AudioBufferSource` trio, the same host-owns-the-device split
 * `packages/rendering/src/backend-detection.ts`'s `selectBackend` and
 * `packages/audio/src/audio-engine.ts`'s `attachRealtimeContext` use.
 */
export interface IMuxerFactory {
  createOutput(): IMuxerOutput;
  createVideoTrackSource(): IVideoTrackSource;
  createAudioTrackSource(): IAudioTrackSource;
}
