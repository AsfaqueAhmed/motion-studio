/**
 * DI interface for fetching model bytes — hand-rolled rather than calling
 * `fetch` directly so tests can inject deterministic bytes without a real
 * network, matching every other network/storage boundary in this codebase
 * (`packages/export/src/container.ts`'s `IMuxerFactory`, `packages/assets`'
 * `IAssetBlobStore`). Progress reporting is intentionally not part of this
 * interface: `fetch`'s `ReadableStream` body would let a real implementation
 * report byte-level progress, but that's streaming plumbing this phase
 * doesn't wire up — see `ModelManager.ensureLoaded`'s note.
 */
export interface IModelDownloader {
  download(url: string): Promise<Uint8Array>;
}

/**
 * SHA-256 via Web Crypto (`crypto.subtle`), available in both browsers and
 * Node 20+ — same primitive `packages/storage/src/asset-blob-store.ts`'s
 * `hashContent` uses, reimplemented locally because AI has no dependency on
 * `@motion-studio/storage` (CLAUDE.md: engines never import each other's
 * concrete classes/packages, only `@motion-studio/shared`).
 */
export async function sha256Hex(data: Uint8Array): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", data as unknown as BufferSource);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

export class ModelChecksumMismatchError extends Error {
  constructor(modelId: string, expected: string, actual: string) {
    super(
      `ModelDownloader: checksum mismatch for "${modelId}" (expected ${expected}, got ${actual})`,
    );
    this.name = "ModelChecksumMismatchError";
  }
}

/** Downloads and verifies one model's bytes against its declared SHA-256 — throws `ModelChecksumMismatchError` on mismatch, never hands unverified bytes to the caller. */
export async function downloadAndVerify(
  downloader: IModelDownloader,
  modelId: string,
  url: string,
  expectedSha256: string,
): Promise<Uint8Array> {
  const data = await downloader.download(url);
  const actual = await sha256Hex(data);
  if (actual !== expectedSha256) {
    throw new ModelChecksumMismatchError(modelId, expectedSha256, actual);
  }
  return data;
}
