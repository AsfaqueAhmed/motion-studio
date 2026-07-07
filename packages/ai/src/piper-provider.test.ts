import { describe, expect, it } from "vitest";
import type { IInferenceTensor } from "./inference-backend";
import { ModelManager } from "./model-manager";
import { sha256Hex } from "./model-downloader";
import { PiperProvider } from "./piper-provider";
import {
  FakeAIEventSink,
  FakeInferenceCapabilityProbe,
  FakeInferenceSession,
  FakeModelBlobStore,
  FakeModelDownloader,
  FakeOnnxRuntime,
  FakePiperTokenizer,
} from "./test-support/fakes";

const MODEL_URL = "https://example.test/piper.onnx";

async function setup(
  runFn: (feeds: Record<string, IInferenceTensor>) => Record<string, IInferenceTensor>,
) {
  const bytes = new Uint8Array([4, 5, 6]);
  const sha256 = await sha256Hex(bytes);
  const modelManager = new ModelManager({
    blobStore: new FakeModelBlobStore(),
    downloader: new FakeModelDownloader(new Map([[MODEL_URL, bytes]])),
    runtime: new FakeOnnxRuntime(new FakeInferenceSession(runFn)),
    capabilityProbe: new FakeInferenceCapabilityProbe(true),
    events: new FakeAIEventSink(),
  });
  modelManager.registerModel({
    id: "piper-en",
    url: MODEL_URL,
    sha256,
    sizeBytes: bytes.byteLength,
  });
  return modelManager;
}

describe("PiperProvider", () => {
  it("feeds the default 'input' tensor and reads the default 'output' tensor", async () => {
    let capturedFeeds: Record<string, IInferenceTensor> | undefined;
    const modelManager = await setup((feeds) => {
      capturedFeeds = feeds;
      return { output: { type: "float32", data: new Float32Array([0.1, 0.2]), dims: [2] } };
    });

    const provider = new PiperProvider({
      modelId: "piper-en",
      modelManager,
      tokenizer: new FakePiperTokenizer(),
      sampleRate: 22050,
    });

    const audio = await provider.synthesize("hello", "en_US-amy");

    expect(capturedFeeds?.["input"]).toBeDefined();
    expect(audio.sampleRate).toBe(22050);
    expect(audio.channelData[0]).toEqual(new Float32Array([0.1, 0.2]));
  });

  it("honors custom input/output tensor names", async () => {
    let capturedFeeds: Record<string, IInferenceTensor> | undefined;
    const modelManager = await setup((feeds) => {
      capturedFeeds = feeds;
      return { audio_out: { type: "float32", data: new Float32Array([1]), dims: [1] } };
    });

    const provider = new PiperProvider({
      modelId: "piper-en",
      modelManager,
      tokenizer: new FakePiperTokenizer(),
      sampleRate: 16000,
      inputTensorName: "text_ids",
      outputTensorName: "audio_out",
    });

    await provider.synthesize("hi", "en_US-amy");
    expect(capturedFeeds?.["text_ids"]).toBeDefined();
  });

  it("throws when the expected output tensor is missing", async () => {
    const modelManager = await setup(() => ({}));
    const provider = new PiperProvider({
      modelId: "piper-en",
      modelManager,
      tokenizer: new FakePiperTokenizer(),
      sampleRate: 16000,
    });

    await expect(provider.synthesize("hi", "en_US-amy")).rejects.toThrow(/output/);
  });
});
