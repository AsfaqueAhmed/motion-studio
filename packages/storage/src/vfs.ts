import type { IStorageAdapter } from "./storage-adapter";

/**
 * The abstraction every other engine depends on instead of a concrete
 * storage backend. Engines call `read/write/delete/exists/list` on an IVFS;
 * only `StorageEngine` knows IndexedDB and OPFS exist. See
 * docs/12-storage/overview.md.
 */
export type IVFS = IStorageAdapter;
