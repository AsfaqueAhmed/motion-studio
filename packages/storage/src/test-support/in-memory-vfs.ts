import type { IVFS } from "../vfs";

/** In-memory IVFS fake for testing repositories without a real storage backend. */
export function createInMemoryVfs(): IVFS {
  const store = new Map<string, Uint8Array>();
  return {
    read: (path) => Promise.resolve(store.get(path)),
    write: (path, data) => {
      store.set(path, data);
      return Promise.resolve();
    },
    delete: (path) => {
      store.delete(path);
      return Promise.resolve();
    },
    exists: (path) => Promise.resolve(store.has(path)),
    list: (prefix) =>
      Promise.resolve(Array.from(store.keys()).filter((path) => path.startsWith(prefix))),
  };
}
