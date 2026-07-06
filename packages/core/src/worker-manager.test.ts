import { describe, expect, it, vi } from "vitest";
import { WorkerSlot, type IWorkerLike, WorkerManager } from "./worker-manager";

function fakeWorker(): IWorkerLike & { listeners: Map<string, Set<(event: unknown) => void>> } {
  const listeners = new Map<string, Set<(event: unknown) => void>>();
  return {
    listeners,
    postMessage: vi.fn(),
    terminate: vi.fn(),
    addEventListener: (type: string, listener: (event: never) => void) => {
      let set = listeners.get(type);
      if (!set) {
        set = new Set();
        listeners.set(type, set);
      }
      set.add(listener as (event: unknown) => void);
    },
    removeEventListener: (type: string, listener: (event: never) => void) => {
      listeners.get(type)?.delete(listener as (event: unknown) => void);
    },
  } as unknown as IWorkerLike & { listeners: Map<string, Set<(event: unknown) => void>> };
}

describe("WorkerManager", () => {
  it("lazily creates a worker on first use via the registered factory", () => {
    const manager = new WorkerManager();
    const factory = vi.fn(fakeWorker);
    manager.registerFactory(WorkerSlot.Rendering, factory);

    expect(manager.has(WorkerSlot.Rendering)).toBe(false);
    manager.postMessage(WorkerSlot.Rendering, { hello: true });

    expect(factory).toHaveBeenCalledTimes(1);
    expect(manager.has(WorkerSlot.Rendering)).toBe(true);
  });

  it("reuses the same worker instance across calls", () => {
    const manager = new WorkerManager();
    const factory = vi.fn(fakeWorker);
    manager.registerFactory(WorkerSlot.Export, factory);

    manager.postMessage(WorkerSlot.Export, { a: 1 });
    manager.postMessage(WorkerSlot.Export, { a: 2 });

    expect(factory).toHaveBeenCalledTimes(1);
  });

  it("throws when posting to a slot with no registered factory", () => {
    const manager = new WorkerManager();
    expect(() => manager.postMessage(WorkerSlot.AIInference, {})).toThrow(
      /No worker factory registered/,
    );
  });

  it("onMessage subscribes to the underlying worker and can unsubscribe", () => {
    const manager = new WorkerManager();
    const worker = fakeWorker();
    manager.registerFactory(WorkerSlot.ThumbnailGen, () => worker);
    const listener = vi.fn();

    const unsubscribe = manager.onMessage(WorkerSlot.ThumbnailGen, listener);
    expect(worker.listeners.get("message")?.size).toBe(1);

    unsubscribe();
    expect(worker.listeners.get("message")?.size).toBe(0);
  });

  it("route() forwards a message to the destination slot", () => {
    const manager = new WorkerManager();
    const rendering = fakeWorker();
    const exportWorker = fakeWorker();
    manager.registerFactory(WorkerSlot.Rendering, () => rendering);
    manager.registerFactory(WorkerSlot.Export, () => exportWorker);
    manager.postMessage(WorkerSlot.Rendering, {});

    manager.route(WorkerSlot.Rendering, WorkerSlot.Export, { frame: 1 });

    expect(exportWorker.postMessage).toHaveBeenCalledWith({ frame: 1 }, undefined);
  });

  it("route() throws when the source slot was never registered", () => {
    const manager = new WorkerManager();
    manager.registerFactory(WorkerSlot.Export, fakeWorker);

    expect(() => manager.route(WorkerSlot.Rendering, WorkerSlot.Export, {})).toThrow(
      /unregistered worker slot/,
    );
  });

  it("terminate() disposes the worker and removes it so it can be recreated", () => {
    const manager = new WorkerManager();
    const first = fakeWorker();
    const factory = vi.fn().mockReturnValueOnce(first).mockReturnValue(fakeWorker());
    manager.registerFactory(WorkerSlot.Rendering, factory);
    manager.postMessage(WorkerSlot.Rendering, {});

    manager.terminate(WorkerSlot.Rendering);

    expect(first.terminate).toHaveBeenCalledTimes(1);
    expect(manager.has(WorkerSlot.Rendering)).toBe(false);

    manager.postMessage(WorkerSlot.Rendering, {});
    expect(factory).toHaveBeenCalledTimes(2);
  });

  it("terminateAll() terminates every active worker", () => {
    const manager = new WorkerManager();
    const rendering = fakeWorker();
    const exportWorker = fakeWorker();
    manager.registerFactory(WorkerSlot.Rendering, () => rendering);
    manager.registerFactory(WorkerSlot.Export, () => exportWorker);
    manager.postMessage(WorkerSlot.Rendering, {});
    manager.postMessage(WorkerSlot.Export, {});

    manager.terminateAll();

    expect(rendering.terminate).toHaveBeenCalledTimes(1);
    expect(exportWorker.terminate).toHaveBeenCalledTimes(1);
  });
});
