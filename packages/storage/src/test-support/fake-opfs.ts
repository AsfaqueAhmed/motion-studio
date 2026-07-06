import type { IOpfsDirectoryHandle, IOpfsFileHandle } from "../opfs-handle";

class NotFoundError extends Error {
  override readonly name = "NotFoundError";
}

class FakeFileHandle implements IOpfsFileHandle {
  readonly kind = "file";
  private bytes = new Uint8Array(0);

  getFile(): Promise<{ arrayBuffer(): Promise<ArrayBuffer> }> {
    const bytes = this.bytes;
    return Promise.resolve({
      arrayBuffer: () =>
        Promise.resolve(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength)),
    });
  }

  createWritable() {
    const chunks: Uint8Array[] = [];
    return Promise.resolve({
      write: (data: Uint8Array) => {
        chunks.push(data);
        return Promise.resolve();
      },
      close: () => {
        const total = chunks.reduce((sum, chunk) => sum + chunk.byteLength, 0);
        const merged = new Uint8Array(total);
        let offset = 0;
        for (const chunk of chunks) {
          merged.set(chunk, offset);
          offset += chunk.byteLength;
        }
        this.bytes = merged;
        return Promise.resolve();
      },
    });
  }
}

class FakeDirectoryHandle implements IOpfsDirectoryHandle {
  readonly kind = "directory";
  private readonly children = new Map<string, FakeDirectoryHandle | FakeFileHandle>();

  getDirectoryHandle(name: string, options?: { create?: boolean }): Promise<IOpfsDirectoryHandle> {
    return Promise.resolve(this.getOrCreate(name, options, () => new FakeDirectoryHandle()));
  }

  getFileHandle(name: string, options?: { create?: boolean }): Promise<IOpfsFileHandle> {
    return Promise.resolve(this.getOrCreate(name, options, () => new FakeFileHandle()));
  }

  removeEntry(name: string, _options?: { recursive?: boolean }): Promise<void> {
    if (!this.children.has(name)) {
      return Promise.reject(new NotFoundError(`"${name}" does not exist.`));
    }
    this.children.delete(name);
    return Promise.resolve();
  }

  async *entries(): AsyncIterableIterator<[string, IOpfsDirectoryHandle | IOpfsFileHandle]> {
    for (const [name, handle] of this.children) {
      yield [name, handle];
    }
  }

  private getOrCreate<T extends FakeDirectoryHandle | FakeFileHandle>(
    name: string,
    options: { create?: boolean } | undefined,
    make: () => T,
  ): T {
    const existing = this.children.get(name);
    if (existing) {
      return existing as T;
    }
    if (!options?.create) {
      throw new NotFoundError(`"${name}" does not exist.`);
    }
    const created = make();
    this.children.set(name, created);
    return created;
  }
}

/** In-memory fake OPFS root for tests — real Node has no OPFS to run against. */
export function createFakeOpfsRoot(): IOpfsDirectoryHandle {
  return new FakeDirectoryHandle();
}
