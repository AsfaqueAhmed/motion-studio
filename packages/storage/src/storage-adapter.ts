/**
 * Common shape implemented by every storage backend (IndexedDB, OPFS).
 * `StorageEngine` (see storage-engine.ts) is the only consumer that needs to
 * know which adapter backs a given path — everything above it talks to the
 * VFS. See docs/12-storage/overview.md.
 */
export interface IStorageAdapter {
  read(path: string): Promise<Uint8Array | undefined>;
  write(path: string, data: Uint8Array): Promise<void>;
  delete(path: string): Promise<void>;
  exists(path: string): Promise<boolean>;
  /** Lists every path stored under `prefix`, e.g. list("thumbnails/") -> ["thumbnails/a/1", ...]. */
  list(prefix: string): Promise<string[]>;
}
