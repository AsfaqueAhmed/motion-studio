import type { AppEventMap, AppEventType } from "@motion-studio/shared";
import {
  resolveInferenceBackend,
  type IInferenceCapabilityProbe,
  type IInferenceSession,
  type InferenceBackend,
  type IOnnxRuntime,
} from "./inference-backend";
import { downloadAndVerify, type IModelDownloader } from "./model-downloader";
import type { IModelBlobStore } from "./model-store";

/** Same generic shape as Export's `IExportEventSink` / Assets' `IAssetEventSink`. */
export interface IAIEventSink {
  emit<T extends AppEventType>(type: T, payload: AppEventMap[T]): void;
}

/** Model metadata (id, source, checksum, size) — `docs/11-ai/overview.md` "Model Registry". */
export interface IModelDescriptor {
  readonly id: string;
  readonly url: string;
  readonly sha256: string;
  readonly sizeBytes: number;
}

export interface IModelManagerOptions {
  readonly blobStore: IModelBlobStore;
  readonly downloader: IModelDownloader;
  readonly runtime: IOnnxRuntime;
  readonly capabilityProbe: IInferenceCapabilityProbe;
  readonly events?: IAIEventSink;
}

/**
 * Download → verify → store → load → unload lifecycle for ONNX model
 * weights (PLAN.md Phase 13's "Model loading via OPFS cache"). Cold path:
 * fetch + SHA-256 verify (`model-downloader.ts`) + write to `IModelBlobStore`
 * + create an `IInferenceSession`. Warm path: read straight from
 * `IModelBlobStore`, skipping the network entirely — mirrors
 * `docs/11-ai/kokoro.md`'s measured 84s cold vs. 0.5s warm load gap.
 *
 * Progress is reported as a single 0 → 1 jump around the download, not
 * real byte-level increments — streaming download progress is real
 * plumbing this phase doesn't wire up, matching Export's job runner and
 * Assets' import pipeline both running on the caller's thread today rather
 * than a Worker.
 */
export class ModelManager {
  private readonly descriptors = new Map<string, IModelDescriptor>();
  private readonly sessions = new Map<string, IInferenceSession>();

  constructor(private readonly options: IModelManagerOptions) {}

  registerModel(descriptor: IModelDescriptor): void {
    this.descriptors.set(descriptor.id, descriptor);
  }

  isLoaded(modelId: string): boolean {
    return this.sessions.has(modelId);
  }

  async ensureLoaded(
    modelId: string,
    preferredBackend?: InferenceBackend,
  ): Promise<IInferenceSession> {
    const existing = this.sessions.get(modelId);
    if (existing) {
      return existing;
    }

    const descriptor = this.descriptors.get(modelId);
    if (!descriptor) {
      throw new Error(`ModelManager: no model registered with id "${modelId}"`);
    }

    try {
      this.options.events?.emit("ModelDownloadProgressed", { modelId, progress: 0 });

      let bytes = await this.options.blobStore.get(modelId);
      if (!bytes) {
        bytes = await downloadAndVerify(
          this.options.downloader,
          modelId,
          descriptor.url,
          descriptor.sha256,
        );
        await this.options.blobStore.put(modelId, bytes);
      }
      this.options.events?.emit("ModelDownloadProgressed", { modelId, progress: 1 });

      const backend = await resolveInferenceBackend(this.options.capabilityProbe, preferredBackend);
      const session = await this.options.runtime.createSession(bytes, backend);
      this.sessions.set(modelId, session);
      this.options.events?.emit("ModelLoaded", { modelId });
      return session;
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      this.options.events?.emit("ModelLoadFailed", { modelId, reason });
      throw error;
    }
  }

  async unload(modelId: string): Promise<void> {
    const session = this.sessions.get(modelId);
    if (!session) {
      return;
    }
    await session.release();
    this.sessions.delete(modelId);
  }

  async unloadAll(): Promise<void> {
    await Promise.all([...this.sessions.keys()].map((modelId) => this.unload(modelId)));
  }
}
