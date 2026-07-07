import { ExportJobStatus, type IExportEngine } from "@motion-studio/shared";
import {
  runExportJob,
  type IExportJobConfig,
  type IExportJobDependencies,
  type IExportJobResult,
} from "./export-job";

export type IExportRunConfig = Omit<IExportJobConfig, "signal">;

/**
 * Thin `IEngine` facade over `export-job.ts`'s `runExportJob`, matching
 * `RenderingEngine`'s split (engine class owns lifecycle + orchestration
 * bookkeeping, a standalone function owns the actual pipeline logic). Owns
 * one `AbortController` per in-flight job so `cancel(jobId)` can be called
 * from outside the run loop — cancellation is only observed at frame
 * boundaries inside `runExportJob`, never mid-frame.
 */
export class ExportEngine implements IExportEngine {
  readonly name = "Export";

  private readonly controllers = new Map<string, AbortController>();

  initialize(): void {}

  ready(): void {}

  dispose(): void {
    for (const controller of this.controllers.values()) {
      controller.abort();
    }
    this.controllers.clear();
  }

  async run(config: IExportRunConfig, deps: IExportJobDependencies): Promise<IExportJobResult> {
    if (this.controllers.has(config.jobId)) {
      throw new Error(`ExportEngine: job "${config.jobId}" is already running`);
    }
    const controller = new AbortController();
    this.controllers.set(config.jobId, controller);
    deps.events?.emit("ExportProgressed", {
      jobId: config.jobId,
      status: ExportJobStatus.Queued,
      progress: 0,
    });

    try {
      return await runExportJob({ ...config, signal: controller.signal }, deps);
    } finally {
      this.controllers.delete(config.jobId);
    }
  }

  cancel(jobId: string): void {
    this.controllers.get(jobId)?.abort();
  }

  isRunning(jobId: string): boolean {
    return this.controllers.has(jobId);
  }
}
