import { AICapability } from "@motion-studio/shared";
import { afterEach, describe, expect, it } from "vitest";
import { AIManager } from "./ai-manager";
import { NoCapabilityProviderError } from "./capability-registry";
import { sha256Hex } from "./model-downloader";
import { ModelManager } from "./model-manager";
import type { ISynthesizedAudio, ITTSProvider } from "./tts-provider";
import { clearVoiceEnhancers, registerVoiceEnhancer } from "./voice-enhancer";
import {
  FakeAIEventSink,
  FakeInferenceCapabilityProbe,
  FakeInferenceSession,
  FakeModelBlobStore,
  FakeModelDownloader,
  FakeOnnxRuntime,
} from "./test-support/fakes";

const audio: ISynthesizedAudio = {
  sampleRate: 24000,
  numberOfChannels: 1,
  durationSeconds: 1,
  channelData: [new Float32Array([0.5])],
};

function fakeTTSProvider(id: string, impl?: () => Promise<ISynthesizedAudio>): ITTSProvider {
  return {
    id,
    capability: AICapability.TextToSpeech,
    modelId: `${id}-model`,
    synthesize: impl ?? (async () => audio),
  };
}

async function makeModelManager() {
  const bytes = new Uint8Array([1, 2, 3]);
  const sha256 = await sha256Hex(bytes);
  const session = new FakeInferenceSession({});
  const manager = new ModelManager({
    blobStore: new FakeModelBlobStore(),
    downloader: new FakeModelDownloader(new Map([["https://example.test/m.onnx", bytes]])),
    runtime: new FakeOnnxRuntime(session),
    capabilityProbe: new FakeInferenceCapabilityProbe(true),
  });
  manager.registerModel({ id: "m", url: "https://example.test/m.onnx", sha256, sizeBytes: 3 });
  return { manager, session };
}

afterEach(() => {
  clearVoiceEnhancers();
});

describe("AIManager.synthesizeSpeech", () => {
  it("resolves the registered provider and emits InferenceCompleted", async () => {
    const { manager: modelManager } = await makeModelManager();
    const events = new FakeAIEventSink();
    const ai = new AIManager({ modelManager, events });
    ai.registerTTSProvider(fakeTTSProvider("kokoro-82m"));

    const result = await ai.synthesizeSpeech("task-1", "hello", "af_heart");

    expect(result).toBe(audio);
    expect(events.events).toEqual([
      {
        type: "InferenceCompleted",
        payload: { taskId: "task-1", capability: AICapability.TextToSpeech },
      },
    ]);
  });

  it("emits InferenceFailed and rethrows when no provider is registered", async () => {
    const { manager: modelManager } = await makeModelManager();
    const events = new FakeAIEventSink();
    const ai = new AIManager({ modelManager, events });

    await expect(ai.synthesizeSpeech("task-1", "hello", "af_heart")).rejects.toThrow(
      NoCapabilityProviderError,
    );
    expect(events.events[0]?.type).toBe("InferenceFailed");
  });

  it("emits InferenceFailed and rethrows when the provider itself throws", async () => {
    const { manager: modelManager } = await makeModelManager();
    const events = new FakeAIEventSink();
    const ai = new AIManager({ modelManager, events });
    ai.registerTTSProvider(
      fakeTTSProvider("kokoro-82m", async () => {
        throw new Error("model exploded");
      }),
    );

    await expect(ai.synthesizeSpeech("task-1", "hello", "af_heart")).rejects.toThrow(
      "model exploded",
    );
    expect(events.events).toEqual([
      {
        type: "InferenceFailed",
        payload: {
          taskId: "task-1",
          capability: AICapability.TextToSpeech,
          reason: "model exploded",
        },
      },
    ]);
  });
});

describe("AIManager.enhanceVoice", () => {
  it("applies a registered enhancer", async () => {
    const { manager: modelManager } = await makeModelManager();
    const ai = new AIManager({ modelManager });
    registerVoiceEnhancer({
      id: "supertonic",
      async enhance(input) {
        return { ...input, durationSeconds: input.durationSeconds * 2 };
      },
    });

    const result = await ai.enhanceVoice(audio, "supertonic");
    expect(result.durationSeconds).toBe(2);
  });

  it("throws for an unregistered enhancer id", async () => {
    const { manager: modelManager } = await makeModelManager();
    const ai = new AIManager({ modelManager });
    await expect(ai.enhanceVoice(audio, "missing")).rejects.toThrow(/no voice enhancer/);
  });
});

describe("AIManager.dispose", () => {
  it("unloads every loaded model", async () => {
    const { manager: modelManager, session } = await makeModelManager();
    await modelManager.ensureLoaded("m");
    const ai = new AIManager({ modelManager });

    await ai.dispose();

    expect(session.released).toBe(true);
  });
});
