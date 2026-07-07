import { describe, expect, it } from "vitest";
import { KOKORO_SAMPLE_RATE, KOKORO_STYLE_DIM, KokoroProvider } from "./kokoro-provider";
import { sha256Hex } from "./model-downloader";
import { ModelManager } from "./model-manager";
import {
  FakeAIEventSink,
  FakeInferenceCapabilityProbe,
  FakeInferenceSession,
  FakeModelBlobStore,
  FakeModelDownloader,
  FakeOnnxRuntime,
  FakePhonemizer,
  FakeVoiceBank,
} from "./test-support/fakes";
import type { IInferenceTensor } from "./inference-backend";

const MODEL_URL = "https://example.test/kokoro.onnx";

async function setup(
  runFn: (feeds: Record<string, IInferenceTensor>) => Record<string, IInferenceTensor>,
) {
  const bytes = new Uint8Array([1, 2, 3]);
  const sha256 = await sha256Hex(bytes);
  const blobStore = new FakeModelBlobStore();
  const downloader = new FakeModelDownloader(new Map([[MODEL_URL, bytes]]));
  const session = new FakeInferenceSession(runFn);
  const runtime = new FakeOnnxRuntime(session);
  const capabilityProbe = new FakeInferenceCapabilityProbe(true);
  const modelManager = new ModelManager({
    blobStore,
    downloader,
    runtime,
    capabilityProbe,
    events: new FakeAIEventSink(),
  });
  modelManager.registerModel({
    id: "kokoro-82m",
    url: MODEL_URL,
    sha256,
    sizeBytes: bytes.byteLength,
  });
  return modelManager;
}

describe("KokoroProvider", () => {
  it("feeds input_ids, style, and speed tensors and returns the waveform as mono 24kHz audio", async () => {
    let capturedFeeds: Record<string, IInferenceTensor> | undefined;
    const modelManager = await setup((feeds) => {
      capturedFeeds = feeds;
      return { waveform: { type: "float32", data: new Float32Array([0.1, 0.2, 0.3]), dims: [3] } };
    });

    const provider = new KokoroProvider({
      modelId: "kokoro-82m",
      modelManager,
      phonemizer: new FakePhonemizer(),
      voiceBank: new FakeVoiceBank(),
    });

    const audio = await provider.synthesize("hello", "af_heart");

    expect(audio.sampleRate).toBe(KOKORO_SAMPLE_RATE);
    expect(audio.numberOfChannels).toBe(1);
    expect(audio.channelData[0]).toEqual(new Float32Array([0.1, 0.2, 0.3]));
    expect(audio.durationSeconds).toBeCloseTo(3 / KOKORO_SAMPLE_RATE);

    expect(capturedFeeds?.["input_ids"]).toBeDefined();
    expect(capturedFeeds?.["style"]?.dims).toEqual([1, KOKORO_STYLE_DIM]);
    expect(capturedFeeds?.["style"]?.data).toHaveLength(KOKORO_STYLE_DIM);
    expect(capturedFeeds?.["speed"]?.data).toEqual(Float32Array.of(1));
  });

  it("uses the provided speed instead of the 1.0 default", async () => {
    let capturedFeeds: Record<string, IInferenceTensor> | undefined;
    const modelManager = await setup((feeds) => {
      capturedFeeds = feeds;
      return { waveform: { type: "float32", data: new Float32Array([0]), dims: [1] } };
    });

    const provider = new KokoroProvider({
      modelId: "kokoro-82m",
      modelManager,
      phonemizer: new FakePhonemizer(),
      voiceBank: new FakeVoiceBank(),
      speed: 1.5,
    });

    await provider.synthesize("hi", "bm_george");

    expect(capturedFeeds?.["speed"]?.data).toEqual(Float32Array.of(1.5));
  });

  it("throws when the model output has no waveform tensor", async () => {
    const modelManager = await setup(() => ({}));
    const provider = new KokoroProvider({
      modelId: "kokoro-82m",
      modelManager,
      phonemizer: new FakePhonemizer(),
      voiceBank: new FakeVoiceBank(),
    });

    await expect(provider.synthesize("hi", "af_heart")).rejects.toThrow(/waveform/);
  });

  it("clamps the style table lookup to the max index for long input", async () => {
    let capturedFeeds: Record<string, IInferenceTensor> | undefined;
    const modelManager = await setup((feeds) => {
      capturedFeeds = feeds;
      return { waveform: { type: "float32", data: new Float32Array([0]), dims: [1] } };
    });

    const provider = new KokoroProvider({
      modelId: "kokoro-82m",
      modelManager,
      phonemizer: {
        async tokenize() {
          return { type: "int64", data: new BigInt64Array(1000), dims: [1, 1000] };
        },
      },
      voiceBank: new FakeVoiceBank(),
    });

    await provider.synthesize("a very long sentence".repeat(50), "af_heart");
    expect(capturedFeeds?.["style"]?.dims).toEqual([1, KOKORO_STYLE_DIM]);
  });
});
