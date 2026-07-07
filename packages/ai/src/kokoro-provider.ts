import { AICapability } from "@motion-studio/shared";
import type { IInferenceTensor } from "./inference-backend";
import type { ModelManager } from "./model-manager";
import type { ISynthesizedAudio, ITTSProvider } from "./tts-provider";

/**
 * Kokoro-82M is a single end-to-end ONNX graph — phonemization happens in
 * pure JS ahead of the ONNX call (`docs/11-ai/kokoro.md`, Spike B confirmed).
 * This is that JS-side step: text normalization (numbers, currency,
 * abbreviations) → `phonemizer` package (espeak-backed) → tokenizer encode
 * → `input_ids` tensor. Not implemented here — same DI boundary as every
 * other "real dependency, not added yet" gap in this codebase (Export's
 * Mediabunny, Assets' `IMetadataExtractor`).
 */
export interface IPhonemizer {
  tokenize(text: string, language: string): Promise<IInferenceTensor>;
}

/**
 * Per-voice style table — matches Kokoro's real `.bin` voice files (e.g.
 * `af_heart.bin`, confirmed 0.51 MB in Spike B): a flat `Float32Array` of
 * 256-dim style vectors, one per possible (clamped) input token count, that
 * `KokoroProvider` slices from at the offset computed in `synthesize()`.
 */
export interface IVoiceBank {
  getVoiceData(voiceId: string): Promise<Float32Array>;
}

/**
 * Confirmed via the vendored `kokoro-js` build used by Spike B
 * (`spikes/spike-b-tts/node_modules/kokoro-js/dist/kokoro.js`):
 * `new r(waveform.data, 24000)` — Kokoro always outputs 24 kHz mono audio,
 * regardless of voice or backend.
 */
export const KOKORO_SAMPLE_RATE = 24000;

/** Style vector width, confirmed by the same source: `new Tensor("float32", styleSlice, [1, 256])`. */
export const KOKORO_STYLE_DIM = 256;

/**
 * Confirmed by the same source's `generate_from_ids`:
 * `256 * Math.min(Math.max(inputIds.dims.at(-1) - 2, 0), 509)` — the style
 * table has 510 entries (indices 0..509), one per clamped token count.
 */
export const KOKORO_MAX_STYLE_INDEX = 509;

export interface IKokoroProviderOptions {
  readonly modelId: string;
  readonly modelManager: ModelManager;
  readonly phonemizer: IPhonemizer;
  readonly voiceBank: IVoiceBank;
  /** Default 1.0 (normal speed), matching kokoro-js's own default. */
  readonly speed?: number;
}

/**
 * Kokoro voice ids follow a `<lang><gender>_<name>` convention (e.g.
 * `af_heart` = American-English Female "Heart", `bm_george` = British-English
 * Male "George") — confirmed by the voice table in the same vendored
 * `kokoro-js` build. Only the language prefix matters for phonemization.
 */
function resolveKokoroLanguage(voiceId: string): string {
  const prefix = voiceId.at(0);
  return prefix === "a" ? "en-us" : prefix === "b" ? "en-gb" : "en";
}

/**
 * `ITTSProvider` over Kokoro-82M. Orchestrates phonemization
 * (`IPhonemizer`) + per-voice style lookup (`IVoiceBank`) + the shared ONNX
 * Runtime backend (`ModelManager`/`inference-backend.ts`) — kept separate
 * from those DI boundaries so this class holds only Kokoro's own, confirmed
 * input/output tensor shapes (`input_ids`, `style`, `speed` → `waveform`).
 * Real production code could satisfy `IPhonemizer`/`IVoiceBank` by wrapping
 * `kokoro-js` directly instead of hand-rolling the ORT session calls this
 * class makes — an open integration choice, not decided here.
 */
export class KokoroProvider implements ITTSProvider {
  readonly id = "kokoro-82m";
  readonly capability = AICapability.TextToSpeech;
  readonly modelId: string;

  constructor(private readonly options: IKokoroProviderOptions) {
    this.modelId = options.modelId;
  }

  async synthesize(text: string, voiceId: string): Promise<ISynthesizedAudio> {
    const language = resolveKokoroLanguage(voiceId);
    const inputIds = await this.options.phonemizer.tokenize(text, language);
    const tokenCount = inputIds.dims.at(-1) ?? 0;

    const voiceTable = await this.options.voiceBank.getVoiceData(voiceId);
    const styleIndex = Math.min(Math.max(tokenCount - 2, 0), KOKORO_MAX_STYLE_INDEX);
    const styleOffset = KOKORO_STYLE_DIM * styleIndex;
    const style = voiceTable.slice(styleOffset, styleOffset + KOKORO_STYLE_DIM);

    const session = await this.options.modelManager.ensureLoaded(this.modelId);
    const outputs = await session.run({
      input_ids: inputIds,
      style: { type: "float32", data: style, dims: [1, KOKORO_STYLE_DIM] },
      speed: { type: "float32", data: Float32Array.of(this.options.speed ?? 1), dims: [1] },
    });

    const waveform = outputs["waveform"];
    if (!waveform) {
      throw new Error('KokoroProvider: model output missing a "waveform" tensor');
    }
    const samples = waveform.data as Float32Array;

    return {
      sampleRate: KOKORO_SAMPLE_RATE,
      numberOfChannels: 1,
      durationSeconds: samples.length / KOKORO_SAMPLE_RATE,
      channelData: [samples],
    };
  }
}
