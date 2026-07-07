/** Opaque handle to a GPU texture — the real payload type is backend-specific (`GPUTexture` / `WebGLTexture` / `ImageBitmap`). */
export interface ITextureHandle {
  readonly key: string;
  readonly width: number;
  readonly height: number;
}

export interface ITextureCache {
  get(key: string): ITextureHandle | undefined;
  set(key: string, handle: ITextureHandle): void;
  has(key: string): boolean;
  delete(key: string): boolean;
  clear(): void;
  readonly size: number;
}

/**
 * Deliberately has **no eviction policy**. `renderer-overview.md` and
 * `gpu-memory.md` both flag the GPU memory budget as an open number — see
 * CLAUDE.md "Known hard risks" #6: "GPU memory budget: no concrete ceiling
 * is specified yet. Don't implement LRU eviction until you have a real
 * memory budget number." An unbounded-but-correct cache is safer than
 * inventing a byte budget; add LRU eviction here once that ceiling exists.
 */
export class TextureCache implements ITextureCache {
  private readonly entries = new Map<string, ITextureHandle>();

  get(key: string): ITextureHandle | undefined {
    return this.entries.get(key);
  }

  set(key: string, handle: ITextureHandle): void {
    this.entries.set(key, handle);
  }

  has(key: string): boolean {
    return this.entries.has(key);
  }

  delete(key: string): boolean {
    return this.entries.delete(key);
  }

  clear(): void {
    this.entries.clear();
  }

  get size(): number {
    return this.entries.size;
  }
}
