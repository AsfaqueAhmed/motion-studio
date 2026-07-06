import type { IStorageAdapter } from "./storage-adapter";

const DB_NAME = "motion-studio";
const DB_VERSION = 1;
const STORE_NAME = "vfs";

interface IVfsRecord {
  path: string;
  data: Uint8Array;
}

function promisifyRequest<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function promisifyTransaction(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error ?? new Error("IndexedDB transaction aborted."));
  });
}

export interface IIndexedDBAdapterDependencies {
  /** Defaults to the global `indexedDB`. Inject `fake-indexeddb` for tests — see indexeddb-adapter.test.ts. */
  indexedDB?: IDBFactory;
  /** Defaults to the global `IDBKeyRange`, needed for the prefix scan in list(). */
  IDBKeyRange?: typeof IDBKeyRange;
  dbName?: string;
}

/**
 * Stores small/structured data (project JSON, settings, thumbnails,
 * waveforms) — see docs/12-storage/indexeddb.md. One object store keyed by
 * VFS path; list() does a lexicographic range scan rather than a real
 * prefix query, since IndexedDB has no native prefix index.
 */
export class IndexedDBAdapter implements IStorageAdapter {
  private readonly factory: IDBFactory;
  private readonly keyRange: typeof IDBKeyRange;
  private readonly dbName: string;
  private dbPromise: Promise<IDBDatabase> | null = null;

  constructor(dependencies: IIndexedDBAdapterDependencies = {}) {
    this.factory = dependencies.indexedDB ?? globalThis.indexedDB;
    this.keyRange = dependencies.IDBKeyRange ?? globalThis.IDBKeyRange;
    this.dbName = dependencies.dbName ?? DB_NAME;
  }

  async read(path: string): Promise<Uint8Array | undefined> {
    const store = await this.store("readonly");
    const record = await promisifyRequest(store.get(path) as IDBRequest<IVfsRecord | undefined>);
    return record?.data;
  }

  async write(path: string, data: Uint8Array): Promise<void> {
    const store = await this.store("readwrite");
    store.put({ path, data } satisfies IVfsRecord);
    await promisifyTransaction(store.transaction);
  }

  async delete(path: string): Promise<void> {
    const store = await this.store("readwrite");
    store.delete(path);
    await promisifyTransaction(store.transaction);
  }

  async exists(path: string): Promise<boolean> {
    const store = await this.store("readonly");
    const key = await promisifyRequest(store.getKey(path));
    return key !== undefined;
  }

  async list(prefix: string): Promise<string[]> {
    const store = await this.store("readonly");
    const range = this.keyRange.bound(prefix, prefix + "￿");
    const keys = await promisifyRequest(store.getAllKeys(range));
    return keys as string[];
  }

  private async store(mode: IDBTransactionMode): Promise<IDBObjectStore> {
    const db = await this.openDb();
    return db.transaction(STORE_NAME, mode).objectStore(STORE_NAME);
  }

  private openDb(): Promise<IDBDatabase> {
    if (!this.dbPromise) {
      this.dbPromise = new Promise((resolve, reject) => {
        const request = this.factory.open(this.dbName, DB_VERSION);
        request.onupgradeneeded = () => {
          const db = request.result;
          if (!db.objectStoreNames.contains(STORE_NAME)) {
            db.createObjectStore(STORE_NAME, { keyPath: "path" });
          }
        };
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
    }
    return this.dbPromise;
  }
}
