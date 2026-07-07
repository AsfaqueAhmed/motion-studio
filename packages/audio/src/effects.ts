import type {
  IAudioBuffer,
  IAudioContext,
  IAudioWorkletContext,
  IAudioWorkletNode,
  IBiquadFilterNode,
  IDelayNode,
  IDynamicsCompressorNode,
  IGainNode,
} from "./audio-context";

/**
 * `docs/10-audio-engine/effects.md` scope, split by what's actually
 * native: EQ/Compressor/Limiter/Delay/Reverb are real Web Audio node
 * graphs below. Noise Gate/Pitch Shift/Speed are not — see
 * `createAudioWorkletEffectNode`.
 */
export enum AudioEffectType {
  EQ = "EQ",
  Compressor = "Compressor",
  Limiter = "Limiter",
  Delay = "Delay",
  Reverb = "Reverb",
  NoiseGate = "NoiseGate",
  PitchShift = "PitchShift",
  Speed = "Speed",
}

export interface IEqBand {
  readonly type: "lowshelf" | "highshelf" | "peaking";
  readonly frequency: number;
  readonly gainDb: number;
  readonly q?: number;
}

export interface IEqChain {
  readonly input: IBiquadFilterNode;
  readonly output: IBiquadFilterNode;
  readonly filters: readonly IBiquadFilterNode[];
}

/** N-band parametric EQ: a chain of `BiquadFilterNode`s, per `effects.md`. */
export function createEqChain(context: IAudioContext, bands: readonly IEqBand[]): IEqChain {
  if (bands.length === 0) {
    throw new Error("createEqChain: at least one band is required");
  }
  const filters = bands.map((band) => {
    const filter = context.createBiquadFilter();
    filter.type = band.type;
    filter.frequency.value = band.frequency;
    filter.gain.value = band.gainDb;
    filter.Q.value = band.q ?? 1;
    return filter;
  });
  const [input, ...rest] = filters;
  if (!input) {
    throw new Error("createEqChain: at least one band is required");
  }
  let previous = input;
  for (const filter of rest) {
    previous.connect(filter);
    previous = filter;
  }
  return { input, output: previous, filters };
}

export interface ICompressorParams {
  readonly thresholdDb?: number;
  readonly kneeDb?: number;
  readonly ratio?: number;
  readonly attackSeconds?: number;
  readonly releaseSeconds?: number;
}

/** General-purpose dynamics compressor, native `DynamicsCompressorNode`. */
export function createCompressorNode(
  context: IAudioContext,
  params: ICompressorParams = {},
): IDynamicsCompressorNode {
  const node = context.createDynamicsCompressor();
  node.threshold.value = params.thresholdDb ?? -24;
  node.knee.value = params.kneeDb ?? 30;
  node.ratio.value = params.ratio ?? 12;
  node.attack.value = params.attackSeconds ?? 0.003;
  node.release.value = params.releaseSeconds ?? 0.25;
  return node;
}

/**
 * Brick-wall-ish limiter: same node type as the compressor above, tuned
 * with a hard ratio/fast attack/zero knee. Also what `Mixer`'s master bus
 * uses (`mixer.ts`) — exposed here too so a per-clip/per-track limiter
 * can be inserted independently of the master bus.
 */
export function createLimiterNode(
  context: IAudioContext,
  thresholdDb = -1,
): IDynamicsCompressorNode {
  const node = context.createDynamicsCompressor();
  node.threshold.value = thresholdDb;
  node.knee.value = 0;
  node.ratio.value = 20;
  node.attack.value = 0.001;
  node.release.value = 0.05;
  return node;
}

/** Native `DelayNode`, clamped to `maxDelaySeconds`. */
export function createDelayNode(
  context: IAudioContext,
  delaySeconds: number,
  maxDelaySeconds = 5,
): IDelayNode {
  if (delaySeconds < 0 || delaySeconds > maxDelaySeconds) {
    throw new Error(`createDelayNode: delaySeconds must be in [0, ${maxDelaySeconds}]`);
  }
  const node = context.createDelay(maxDelaySeconds);
  node.delayTime.value = delaySeconds;
  return node;
}

export interface IReverbChain {
  readonly input: IGainNode;
  readonly output: IGainNode;
}

/**
 * Convolution reverb: native `ConvolverNode` driven by a caller-supplied
 * impulse response, wet/dry mixed through two gain nodes. This package
 * doesn't synthesize impulse responses (that's an Assets-catalog concern,
 * same split as `waveform.ts` not generating waveforms) — it only wires
 * the mixing graph around one.
 */
export function createReverbChain(
  context: IAudioContext,
  impulseResponse: IAudioBuffer,
  wetMix = 0.3,
): IReverbChain {
  if (wetMix < 0 || wetMix > 1) {
    throw new Error("createReverbChain: wetMix must be in [0, 1]");
  }
  const input = context.createGain();
  const output = context.createGain();

  const dryGain = context.createGain();
  dryGain.gain.value = 1 - wetMix;
  input.connect(dryGain);
  dryGain.connect(output);

  const convolver = context.createConvolver();
  convolver.buffer = impulseResponse;
  const wetGain = context.createGain();
  wetGain.gain.value = wetMix;
  input.connect(convolver);
  convolver.connect(wetGain);
  wetGain.connect(output);

  return { input, output };
}

export interface IAudioWorkletEffectOptions {
  readonly moduleUrl: string;
  readonly processorName: string;
  readonly parameterData?: Record<string, unknown>;
}

/**
 * Noise Gate, Pitch Shift, and Speed all need real per-sample DSP (a
 * threshold-triggered gate, or a phase vocoder) that `BiquadFilterNode`/
 * `DynamicsCompressorNode` compositions cannot express — this is
 * CLAUDE.md "Known hard risks" territory, not a native-node graph like
 * the functions above. `docs/10-audio-engine/overview.md`'s original
 * draft grouped Noise Gate with the native set; that was wrong (a true
 * gate needs a dynamic per-sample threshold decision the compressor curve
 * can't do) and is corrected in this pass — see `effects.md`.
 *
 * This function is the real, working registration/instantiation
 * plumbing — `context.audioWorklet.addModule` + `createAudioWorkletNode`
 * against a caller-supplied processor script. The actual DSP algorithm
 * (the gate's threshold/hysteresis logic, the phase vocoder's STFT/
 * overlap-add) is out of scope for this pass: writing a correct phase
 * vocoder is its own project, not something to fake with placeholder
 * math that would silently produce wrong audio.
 */
export async function createAudioWorkletEffectNode(
  context: IAudioWorkletContext,
  options: IAudioWorkletEffectOptions,
): Promise<IAudioWorkletNode> {
  await context.audioWorklet.addModule(options.moduleUrl);
  return context.createAudioWorkletNode(
    options.processorName,
    options.parameterData !== undefined ? { processorOptions: options.parameterData } : undefined,
  );
}
