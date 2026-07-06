/** Initial worker slots per PLAN.md Phase 2.4. */
export enum WorkerSlot {
  Rendering = "rendering",
  Export = "export",
  AIInference = "ai-inference",
  ThumbnailGen = "thumbnail-gen",
}

/**
 * Structural subset of the DOM `Worker` API. Kept minimal and
 * bundler-agnostic so Core never has an opinion on *how* a worker is
 * constructed (`new Worker(new URL(...))`, a Next.js worker loader, or a
 * test double) — only the app shell that owns a WorkerSlot's factory does.
 */
export interface IWorkerLike {
  postMessage(message: unknown, transfer?: Transferable[]): void;
  terminate(): void;
  addEventListener(type: "message", listener: (event: MessageEvent) => void): void;
  addEventListener(type: "error", listener: (event: ErrorEvent) => void): void;
  removeEventListener(type: "message" | "error", listener: (event: Event) => void): void;
}

export type WorkerFactory = () => IWorkerLike;
export type WorkerMessageListener = (event: MessageEvent) => void;

/**
 * Owns every dedicated worker. Workers never talk to each other directly —
 * any cross-worker communication is routed through Core via this manager.
 * See docs/04-core/core-overview.md.
 */
export class WorkerManager {
  private readonly factories = new Map<WorkerSlot, WorkerFactory>();
  private readonly workers = new Map<WorkerSlot, IWorkerLike>();

  registerFactory(slot: WorkerSlot, factory: WorkerFactory): void {
    this.factories.set(slot, factory);
  }

  postMessage(slot: WorkerSlot, message: unknown, transfer?: Transferable[]): void {
    this.ensureWorker(slot).postMessage(message, transfer);
  }

  /** Routes a message emitted by one worker slot to another, so callers never wire workers directly to each other. */
  route(
    fromSlot: WorkerSlot,
    toSlot: WorkerSlot,
    message: unknown,
    transfer?: Transferable[],
  ): void {
    if (!this.workers.has(fromSlot) && !this.factories.has(fromSlot)) {
      throw new Error(`Cannot route from unregistered worker slot "${fromSlot}".`);
    }
    this.postMessage(toSlot, message, transfer);
  }

  onMessage(slot: WorkerSlot, listener: WorkerMessageListener): () => void {
    const worker = this.ensureWorker(slot);
    worker.addEventListener("message", listener);
    return () => worker.removeEventListener("message", listener as (event: Event) => void);
  }

  onError(slot: WorkerSlot, listener: (event: ErrorEvent) => void): () => void {
    const worker = this.ensureWorker(slot);
    worker.addEventListener("error", listener);
    return () => worker.removeEventListener("error", listener as (event: Event) => void);
  }

  has(slot: WorkerSlot): boolean {
    return this.workers.has(slot);
  }

  terminate(slot: WorkerSlot): void {
    this.workers.get(slot)?.terminate();
    this.workers.delete(slot);
  }

  terminateAll(): void {
    for (const slot of this.workers.keys()) {
      this.terminate(slot);
    }
  }

  private ensureWorker(slot: WorkerSlot): IWorkerLike {
    let worker = this.workers.get(slot);
    if (worker) {
      return worker;
    }
    const factory = this.factories.get(slot);
    if (!factory) {
      throw new Error(`No worker factory registered for slot "${slot}".`);
    }
    worker = factory();
    this.workers.set(slot, worker);
    return worker;
  }
}
