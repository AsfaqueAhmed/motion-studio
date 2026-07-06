import type { IVFS } from "./vfs";

const ASSETS_DIR = "assets";

/**
 * Content-hash-addressed binary storage in OPFS. See
 * docs/12-storage/asset-cache.md. Not an `IRepository<T>` — there's no
 * per-item id besides the hash of the content itself, and `put` is
 * naturally idempotent (importing the same file twice writes the same
 * path), which is what gives dedup for free.
 */
export class AssetBlobStore {
  constructor(private readonly vfs: IVFS) {}

  /** Hashes `data`, writes it if not already present, and returns the content hash. */
  async put(data: Uint8Array): Promise<string> {
    const hash = await hashContent(data);
    if (!(await this.has(hash))) {
      await this.vfs.write(this.pathFor(hash), data);
    }
    return hash;
  }

  get(hash: string): Promise<Uint8Array | undefined> {
    return this.vfs.read(this.pathFor(hash));
  }

  has(hash: string): Promise<boolean> {
    return this.vfs.exists(this.pathFor(hash));
  }

  delete(hash: string): Promise<void> {
    return this.vfs.delete(this.pathFor(hash));
  }

  private pathFor(hash: string): string {
    return `${ASSETS_DIR}/${hash}`;
  }
}

/**
 * SHA-256 via Web Crypto (`crypto.subtle`), available in both browsers and
 * Node 20+. Runs on the caller's thread — see the "Asset hashing cost for
 * large files" open risk in docs/12-storage/overview.md: cost against a
 * multi-GB video has not actually been measured, and if it turns out to
 * matter, offloading to a worker is the Asset Manager import pipeline's
 * job (Phase 12), not this primitive's.
 */
export async function hashContent(data: Uint8Array): Promise<string> {
  // Cast only: TS's `BufferSource` now requires an `ArrayBuffer`-backed view
  // specifically, but `Uint8Array<ArrayBufferLike>` satisfies the real
  // runtime shape `crypto.subtle.digest` expects — no copy needed.
  const digest = await crypto.subtle.digest("SHA-256", data as unknown as BufferSource);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}
