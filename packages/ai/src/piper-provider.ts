import { AICapability } from "@motion-studio/shared";
import type { IInferenceTensor } from "./inference-backend";
import type { ModelManager } from "./model-manager";
import type { ISynthesizedAudio, ITTSProvider } from "./tts-provider";

/**
 * `docs/11-ai/piper.md`: "Real load time, generate time, and model size for
 * Piper are unmeasured... Confirm which JS runtime/wrapper to use." Unlike
 * `KokoroProvider` (whose tensor names/shapes are confirmed against a
 * vendored real build), Piper's actual ONNX input/output tensor names are
 * **not verified anywhere in this codebase** — `inputTensorName`/
 * `outputTensorName` are guesses based on common Piper/VITS ONNX exports
 * (`input`, `output`) and must be corrected once Piper gets its own spike.
 * Architecturally, Piper is confirmed to be the same *kind* of thing as
 * Kokoro (an independent, complete `TextToSpeech` provider, not a pipeline
 * stage after it) — that shape is what this class actually implements
 * correctly; the tensor names are the part still owed a real spike.
 */
export interface IPiperTokenizer {
  tokenize(text: string, voiceId: string): Promise<IInferenceTensor>;
}

export interface IPiperProviderOptions {
  readonly modelId: string;
  readonly modelManager: ModelManager;
  readonly tokenizer: IPiperTokenizer;
  /** Piper models commonly output 16 kHz or 22.05 kHz audio depending on training config — unverified for any specific voice, must be supplied by the caller per registered model. */
  readonly sampleRate: number;
  readonly inputTensorName?: string;
  readonly outputTensorName?: string;
}

const DEFAULT_INPUT_TENSOR_NAME = "input";
const DEFAULT_OUTPUT_TENSOR_NAME = "output";

/** `ITTSProvider` over Piper — see the module-level doc comment for what is and isn't verified. */
export class PiperProvider implements ITTSProvider {
  readonly id = "piper";
  readonly capability = AICapability.TextToSpeech;
  readonly modelId: string;

  constructor(private readonly options: IPiperProviderOptions) {
    this.modelId = options.modelId;
  }

  async synthesize(text: string, voiceId: string): Promise<ISynthesizedAudio> {
    const inputTensor = await this.options.tokenizer.tokenize(text, voiceId);
    const session = await this.options.modelManager.ensureLoaded(this.modelId);
    const outputs = await session.run({
      [this.options.inputTensorName ?? DEFAULT_INPUT_TENSOR_NAME]: inputTensor,
    });

    const outputTensor = outputs[this.options.outputTensorName ?? DEFAULT_OUTPUT_TENSOR_NAME];
    if (!outputTensor) {
      throw new Error(
        `PiperProvider: model output missing "${this.options.outputTensorName ?? DEFAULT_OUTPUT_TENSOR_NAME}" tensor`,
      );
    }
    const samples = outputTensor.data as Float32Array;

    return {
      sampleRate: this.options.sampleRate,
      numberOfChannels: 1,
      durationSeconds: samples.length / this.options.sampleRate,
      channelData: [samples],
    };
  }
}
