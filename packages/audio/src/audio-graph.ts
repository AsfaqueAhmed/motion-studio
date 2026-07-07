import type {
  IAudioBuffer,
  IAudioBufferSourceNode,
  IAudioContext,
  IAudioNode,
  IGainNode,
  IStereoPannerNode,
} from "./audio-context";

export interface IClipChainOptions {
  readonly buffer: IAudioBuffer;
  /** 0 = silent, 1 = unity gain — matches `IAudioLayer.volume` (`@motion-studio/shared`). */
  readonly volume: number;
  /** -1 (full left) .. 1 (full right). Defaults to center. */
  readonly pan?: number;
  readonly loop?: boolean;
  readonly playbackRate?: number;
}

/**
 * One layer's realized node chain: `Clip -> Gain -> Pan`, per
 * `docs/10-audio-engine/audio-graph.md`. `connect()` wires the chain's
 * output — either straight to a Mixer track bus input, or to the first
 * node of an effect chain (`effects.ts`) when the layer has effects,
 * matching the full `Clip -> Gain -> Pan -> Effects -> Track Bus` order.
 *
 * This is a plain `.connect()` wiring, not an instance of the ADR-005
 * generic DAG primitive: Web Audio's own native graph *is* the execution
 * engine here (the browser schedules and runs it), so there's no separate
 * "evaluate this graph" step to order — unlike the Render Graph, which
 * hands ordered effect nodes to a GPU backend that has no native graph of
 * its own.
 */
export interface IClipChain {
  readonly source: IAudioBufferSourceNode;
  readonly gain: IGainNode;
  readonly pan: IStereoPannerNode;
  connect(destination: IAudioNode): void;
  start(when: number, offset?: number, duration?: number): void;
  stop(when: number): void;
}

export function buildClipChain(context: IAudioContext, options: IClipChainOptions): IClipChain {
  if (options.volume < 0) {
    throw new Error("buildClipChain: volume must be >= 0");
  }
  if (options.pan !== undefined && (options.pan < -1 || options.pan > 1)) {
    throw new Error("buildClipChain: pan must be in [-1, 1]");
  }

  const source = context.createBufferSource();
  source.buffer = options.buffer;
  source.loop = options.loop ?? false;
  source.playbackRate.value = options.playbackRate ?? 1;

  const gain = context.createGain();
  gain.gain.value = options.volume;

  const pan = context.createStereoPanner();
  pan.pan.value = options.pan ?? 0;

  source.connect(gain);
  gain.connect(pan);

  return {
    source,
    gain,
    pan,
    connect: (destination) => {
      pan.connect(destination);
    },
    start: (when, offset, duration) => {
      source.start(when, offset, duration);
    },
    stop: (when) => {
      source.stop(when);
    },
  };
}
