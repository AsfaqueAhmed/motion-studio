/**
 * Structural subset of the real OPFS `FileSystemFileHandle`/
 * `FileSystemDirectoryHandle` APIs — kept minimal so tests can inject an
 * in-memory fake instead of running in a real OPFS-capable browser, mirroring
 * how `WorkerManager` depends on `IWorkerLike` rather than the full `Worker`
 * type. Real handles satisfy this shape structurally, no adapter needed.
 */
export interface IOpfsFileHandle {
  readonly kind: "file";
  getFile(): Promise<{ arrayBuffer(): Promise<ArrayBuffer> }>;
  createWritable(): Promise<IOpfsWritableStream>;
}

export interface IOpfsWritableStream {
  write(data: Uint8Array): Promise<void>;
  close(): Promise<void>;
}

export interface IOpfsDirectoryHandle {
  readonly kind: "directory";
  getDirectoryHandle(name: string, options?: { create?: boolean }): Promise<IOpfsDirectoryHandle>;
  getFileHandle(name: string, options?: { create?: boolean }): Promise<IOpfsFileHandle>;
  removeEntry(name: string, options?: { recursive?: boolean }): Promise<void>;
  entries(): AsyncIterableIterator<[string, IOpfsDirectoryHandle | IOpfsFileHandle]>;
}

export type OpfsRootFactory = () => Promise<IOpfsDirectoryHandle>;

/** Default root factory for real browsers — see docs/12-storage/opfs.md. */
export const defaultOpfsRootFactory: OpfsRootFactory = () =>
  navigator.storage.getDirectory() as unknown as Promise<IOpfsDirectoryHandle>;
