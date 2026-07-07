import { describe, expect, it } from "vitest";
import { ModelChecksumMismatchError, downloadAndVerify, sha256Hex } from "./model-downloader";
import { FakeModelDownloader } from "./test-support/fakes";

describe("sha256Hex", () => {
  it("is deterministic for the same bytes", async () => {
    const data = new Uint8Array([1, 2, 3, 4]);
    const first = await sha256Hex(data);
    const second = await sha256Hex(data);
    expect(first).toBe(second);
    expect(first).toMatch(/^[0-9a-f]{64}$/);
  });

  it("differs for different bytes", async () => {
    const a = await sha256Hex(new Uint8Array([1]));
    const b = await sha256Hex(new Uint8Array([2]));
    expect(a).not.toBe(b);
  });
});

describe("downloadAndVerify", () => {
  it("returns bytes when the checksum matches", async () => {
    const data = new Uint8Array([9, 8, 7]);
    const expected = await sha256Hex(data);
    const downloader = new FakeModelDownloader(
      new Map([["https://example.test/model.onnx", data]]),
    );

    const result = await downloadAndVerify(
      downloader,
      "model-1",
      "https://example.test/model.onnx",
      expected,
    );
    expect(result).toBe(data);
  });

  it("throws ModelChecksumMismatchError when the checksum doesn't match", async () => {
    const data = new Uint8Array([9, 8, 7]);
    const downloader = new FakeModelDownloader(
      new Map([["https://example.test/model.onnx", data]]),
    );

    await expect(
      downloadAndVerify(downloader, "model-1", "https://example.test/model.onnx", "deadbeef"),
    ).rejects.toThrow(ModelChecksumMismatchError);
  });
});
