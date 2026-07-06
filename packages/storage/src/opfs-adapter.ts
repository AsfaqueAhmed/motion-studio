import type { IStorageAdapter } from "./storage-adapter";
import {
  defaultOpfsRootFactory,
  type IOpfsDirectoryHandle,
  type IOpfsFileHandle,
  type OpfsRootFactory,
} from "./opfs-handle";

function splitPath(path: string): { dirs: string[]; name: string } {
  const segments = path.split("/").filter(Boolean);
  if (segments.length === 0) {
    throw new Error(`Invalid VFS path: "${path}"`);
  }
  return { dirs: segments.slice(0, -1), name: segments[segments.length - 1] as string };
}

function isNotFoundError(error: unknown): boolean {
  return error instanceof Error && error.name === "NotFoundError";
}

export interface IOpfsAdapterDependencies {
  /** Defaults to `navigator.storage.getDirectory()`. Inject a fake root for tests. */
  getRoot?: OpfsRootFactory;
}

/**
 * Stores large binaries (media files, AI models, voice cache, exports) —
 * see docs/12-storage/opfs.md. A VFS path maps to nested OPFS directories,
 * with the final segment as the file name.
 */
export class OpfsAdapter implements IStorageAdapter {
  private readonly getRoot: OpfsRootFactory;
  private rootPromise: Promise<IOpfsDirectoryHandle> | null = null;

  constructor(dependencies: IOpfsAdapterDependencies = {}) {
    this.getRoot = dependencies.getRoot ?? defaultOpfsRootFactory;
  }

  async read(path: string): Promise<Uint8Array | undefined> {
    const file = await this.locateFile(path);
    if (!file) {
      return undefined;
    }
    const blob = await file.getFile();
    return new Uint8Array(await blob.arrayBuffer());
  }

  async write(path: string, data: Uint8Array): Promise<void> {
    const { dirs, name } = splitPath(path);
    const dir = await this.ensureDir(dirs, true);
    if (!dir) {
      throw new Error(`Failed to create OPFS directory for path "${path}".`);
    }
    const file = await dir.getFileHandle(name, { create: true });
    const writable = await file.createWritable();
    await writable.write(data);
    await writable.close();
  }

  async delete(path: string): Promise<void> {
    const { dirs, name } = splitPath(path);
    const dir = await this.ensureDir(dirs, false);
    if (!dir) {
      return;
    }
    try {
      await dir.removeEntry(name, { recursive: true });
    } catch (error) {
      if (!isNotFoundError(error)) {
        throw error;
      }
    }
  }

  async exists(path: string): Promise<boolean> {
    return (await this.locateFile(path)) !== undefined;
  }

  async list(prefix: string): Promise<string[]> {
    const out: string[] = [];
    // Every real caller passes a directory prefix ending in "/" (see
    // json-repository.ts, project-repository.ts, thumbnail-cache.ts) — for
    // that shape we can descend straight to the matching directory instead
    // of walking the entire OPFS tree and filtering afterwards.
    if (prefix.endsWith("/")) {
      const dirPath = prefix.slice(0, -1);
      const dir = await this.ensureDir(dirPath.split("/").filter(Boolean), false);
      if (dir) {
        await this.walk(dir, dirPath, out);
      }
      return out;
    }
    const root = await this.ensureRoot();
    await this.walk(root, "", out);
    return out.filter((path) => path.startsWith(prefix));
  }

  private async walk(dir: IOpfsDirectoryHandle, currentPath: string, out: string[]): Promise<void> {
    for await (const [name, handle] of dir.entries()) {
      const path = currentPath ? `${currentPath}/${name}` : name;
      if (handle.kind === "file") {
        out.push(path);
      } else {
        await this.walk(handle, path, out);
      }
    }
  }

  private async locateFile(path: string): Promise<IOpfsFileHandle | undefined> {
    const { dirs, name } = splitPath(path);
    const dir = await this.ensureDir(dirs, false);
    if (!dir) {
      return undefined;
    }
    try {
      return await dir.getFileHandle(name, { create: false });
    } catch (error) {
      if (isNotFoundError(error)) {
        return undefined;
      }
      throw error;
    }
  }

  private async ensureDir(
    segments: string[],
    create: boolean,
  ): Promise<IOpfsDirectoryHandle | undefined> {
    let dir = await this.ensureRoot();
    for (const segment of segments) {
      try {
        dir = await dir.getDirectoryHandle(segment, { create });
      } catch (error) {
        if (isNotFoundError(error)) {
          return undefined;
        }
        throw error;
      }
    }
    return dir;
  }

  private ensureRoot(): Promise<IOpfsDirectoryHandle> {
    if (!this.rootPromise) {
      this.rootPromise = this.getRoot();
    }
    return this.rootPromise;
  }
}
