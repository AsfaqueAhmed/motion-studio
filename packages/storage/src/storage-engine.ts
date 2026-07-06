import type { IEngine } from "@motion-studio/shared";
import { IndexedDBAdapter } from "./indexeddb-adapter";
import { OpfsAdapter } from "./opfs-adapter";
import type { IStorageAdapter } from "./storage-adapter";
import type { IVFS } from "./vfs";

/** Top-level directory -> backend. See the "Storage split" table in docs/12-storage/overview.md. */
const INDEXEDDB_DIRECTORIES = new Set(["projects", "settings", "thumbnails", "waveforms"]);
const OPFS_DIRECTORIES = new Set(["assets", "models", "voice-cache", "exports"]);

function topLevelDirectory(path: string): string {
  const segment = path.split("/", 1)[0];
  if (!segment) {
    throw new Error(`Invalid VFS path: "${path}"`);
  }
  return segment;
}

export interface IStorageEngineDependencies {
  indexedDb?: IStorageAdapter;
  opfs?: IStorageAdapter;
}

/**
 * The only module that talks to actual browser storage. Implements IVFS by
 * routing each path to IndexedDB or OPFS based on its top-level directory —
 * every other engine depends on IVFS, never on IndexedDBAdapter/OpfsAdapter
 * directly. See docs/12-storage/overview.md.
 */
export class StorageEngine implements IEngine, IVFS {
  readonly name = "Storage";

  private readonly indexedDb: IStorageAdapter;
  private readonly opfs: IStorageAdapter;

  constructor(dependencies: IStorageEngineDependencies = {}) {
    this.indexedDb = dependencies.indexedDb ?? new IndexedDBAdapter();
    this.opfs = dependencies.opfs ?? new OpfsAdapter();
  }

  initialize(): void {
    // No async setup required today — both adapters open lazily on first use.
  }

  ready(): void {}

  dispose(): void {}

  async read(path: string): Promise<Uint8Array | undefined> {
    return this.route(path).read(path);
  }

  async write(path: string, data: Uint8Array): Promise<void> {
    return this.route(path).write(path, data);
  }

  async delete(path: string): Promise<void> {
    return this.route(path).delete(path);
  }

  async exists(path: string): Promise<boolean> {
    return this.route(path).exists(path);
  }

  async list(prefix: string): Promise<string[]> {
    return this.route(prefix).list(prefix);
  }

  private route(path: string): IStorageAdapter {
    const directory = topLevelDirectory(path);
    if (INDEXEDDB_DIRECTORIES.has(directory)) {
      return this.indexedDb;
    }
    if (OPFS_DIRECTORIES.has(directory)) {
      return this.opfs;
    }
    throw new Error(
      `No storage backend registered for top-level directory "${directory}" (path: "${path}").`,
    );
  }
}
