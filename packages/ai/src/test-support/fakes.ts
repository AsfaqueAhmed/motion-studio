import type { AppEventMap, AppEventType } from "@motion-studio/shared";
import type {
  IInferenceCapabilityProbe,
  IInferenceSession,
  IInferenceTensor,
  InferenceBackend,
  IOnnxRuntime,
} from "../inference-backend";
import type { IAIEventSink } from "../model-manager";
import type { IModelDownloader } from "../model-downloader";
import type { IModelBlobStore } from "../model-store";
import type { IPhonemizer, IVoiceBank } from "../kokoro-provider";
import type { IPiperTokenizer } from "../piper-provider";

/** Always-succeeding in-memory fakes of the AI Engine's DI surface — no real ONNX Runtime/OPFS/network exists in this package's Node test environment, matching `packages/assets/src/test-support/fakes.ts`'s approach. */

export class FakeModelBlobStore implements IModelBlobStore {
  readonly blobs = new Map<string, Uint8Array>();

  async get(modelId: string): Promise<Uint8Array | undefined> {
    return this.blobs.get(modelId);
  }

  async put(modelId: string, data: Uint8Array): Promise<void> {
    this.blobs.set(modelId, data);
  }

  async has(modelId: string): Promise<boolean> {
    return this.blobs.has(modelId);
  }

  async delete(modelId: string): Promise<void> {
    this.blobs.delete(modelId);
  }
}

export class FakeModelDownloader implements IModelDownloader {
  calls: string[] = [];

  constructor(private readonly bytesByUrl: Map<string, Uint8Array>) {}

  async download(url: string): Promise<Uint8Array> {
    this.calls.push(url);
    const bytes = this.bytesByUrl.get(url);
    if (!bytes) {
      throw new Error(`FakeModelDownloader: no bytes registered for "${url}"`);
    }
    return bytes;
  }
}

export class FakeInferenceCapabilityProbe implements IInferenceCapabilityProbe {
  constructor(private readonly webGpuAvailable: boolean) {}

  async isWebGpuAvailable(): Promise<boolean> {
    return this.webGpuAvailable;
  }
}

export class FakeInferenceSession implements IInferenceSession {
  released = false;

  constructor(
    private readonly outputs:
      | Record<string, IInferenceTensor>
      | ((feeds: Record<string, IInferenceTensor>) => Record<string, IInferenceTensor>),
  ) {}

  async run(feeds: Record<string, IInferenceTensor>): Promise<Record<string, IInferenceTensor>> {
    return typeof this.outputs === "function" ? this.outputs(feeds) : this.outputs;
  }

  async release(): Promise<void> {
    this.released = true;
  }
}

export class FakeOnnxRuntime implements IOnnxRuntime {
  readonly createdSessions: { modelBytes: Uint8Array; backend: InferenceBackend }[] = [];

  constructor(private readonly session: FakeInferenceSession) {}

  async createSession(
    modelBytes: Uint8Array,
    backend: InferenceBackend,
  ): Promise<IInferenceSession> {
    this.createdSessions.push({ modelBytes, backend });
    return this.session;
  }
}

export class FakePhonemizer implements IPhonemizer {
  async tokenize(text: string): Promise<IInferenceTensor> {
    const ids = BigInt64Array.from([
      0n,
      ...Array.from(text).map((_, index) => BigInt(index + 1)),
      0n,
    ]);
    return { type: "int64", data: ids, dims: [1, ids.length] };
  }
}

export class FakeVoiceBank implements IVoiceBank {
  constructor(private readonly tableSize = 256 * 510) {}

  async getVoiceData(): Promise<Float32Array> {
    return new Float32Array(this.tableSize).fill(0.5);
  }
}

export class FakePiperTokenizer implements IPiperTokenizer {
  async tokenize(text: string): Promise<IInferenceTensor> {
    const ids = Int32Array.from(Array.from(text).map((_, index) => index + 1));
    return { type: "int32", data: ids, dims: [1, ids.length] };
  }
}

export class FakeAIEventSink implements IAIEventSink {
  readonly events: { type: AppEventType; payload: unknown }[] = [];

  emit<T extends AppEventType>(type: T, payload: AppEventMap[T]): void {
    this.events.push({ type, payload });
  }
}
