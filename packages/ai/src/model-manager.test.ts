import { describe, expect, it } from "vitest";
import { InferenceBackend } from "./inference-backend";
import { sha256Hex } from "./model-downloader";
import { ModelManager } from "./model-manager";
import {
  FakeAIEventSink,
  FakeInferenceCapabilityProbe,
  FakeInferenceSession,
  FakeModelBlobStore,
  FakeModelDownloader,
  FakeOnnxRuntime,
} from "./test-support/fakes";

const MODEL_URL = "https://example.test/model.onnx";

async function setup(webGpuAvailable = true) {
  const bytes = new Uint8Array([1, 2, 3, 4, 5]);
  const sha256 = await sha256Hex(bytes);
  const blobStore = new FakeModelBlobStore();
  const downloader = new FakeModelDownloader(new Map([[MODEL_URL, bytes]]));
  const session = new FakeInferenceSession({});
  const runtime = new FakeOnnxRuntime(session);
  const capabilityProbe = new FakeInferenceCapabilityProbe(webGpuAvailable);
  const events = new FakeAIEventSink();

  const manager = new ModelManager({ blobStore, downloader, runtime, capabilityProbe, events });
  manager.registerModel({ id: "kokoro-82m", url: MODEL_URL, sha256, sizeBytes: bytes.byteLength });

  return {
    bytes,
    sha256,
    blobStore,
    downloader,
    session,
    runtime,
    capabilityProbe,
    events,
    manager,
  };
}

describe("ModelManager.ensureLoaded", () => {
  it("cold path: downloads, verifies, stores, and creates a session", async () => {
    const { downloader, blobStore, runtime, events, manager } = await setup();

    const session = await manager.ensureLoaded("kokoro-82m");

    expect(downloader.calls).toEqual([MODEL_URL]);
    expect(await blobStore.has("kokoro-82m")).toBe(true);
    expect(runtime.createdSessions).toHaveLength(1);
    expect(runtime.createdSessions[0]!.backend).toBe(InferenceBackend.WebGpu);
    expect(session).toBeDefined();
    expect(events.events.map((event) => event.type)).toEqual([
      "ModelDownloadProgressed",
      "ModelDownloadProgressed",
      "ModelLoaded",
    ]);
  });

  it("warm path: reuses the blob store and skips the network", async () => {
    const { bytes, blobStore, downloader, manager } = await setup();
    await blobStore.put("kokoro-82m", bytes);

    await manager.ensureLoaded("kokoro-82m");

    expect(downloader.calls).toEqual([]);
  });

  it("reuses an already-loaded session instead of recreating it", async () => {
    const { runtime, manager } = await setup();

    const first = await manager.ensureLoaded("kokoro-82m");
    const second = await manager.ensureLoaded("kokoro-82m");

    expect(first).toBe(second);
    expect(runtime.createdSessions).toHaveLength(1);
  });

  it("falls back to WASM when WebGPU is unavailable", async () => {
    const { runtime, manager } = await setup(false);

    await manager.ensureLoaded("kokoro-82m");

    expect(runtime.createdSessions[0]!.backend).toBe(InferenceBackend.Wasm);
  });

  it("throws for an unregistered model", async () => {
    const { manager } = await setup();
    await expect(manager.ensureLoaded("unknown-model")).rejects.toThrow(/no model registered/);
  });

  it("emits ModelLoadFailed and rethrows on checksum mismatch", async () => {
    const bytes = new Uint8Array([1, 2, 3]);
    const blobStore = new FakeModelBlobStore();
    const downloader = new FakeModelDownloader(new Map([[MODEL_URL, bytes]]));
    const runtime = new FakeOnnxRuntime(new FakeInferenceSession({}));
    const capabilityProbe = new FakeInferenceCapabilityProbe(true);
    const events = new FakeAIEventSink();
    const manager = new ModelManager({ blobStore, downloader, runtime, capabilityProbe, events });
    manager.registerModel({ id: "bad-model", url: MODEL_URL, sha256: "deadbeef", sizeBytes: 3 });

    await expect(manager.ensureLoaded("bad-model")).rejects.toThrow();
    expect(events.events.map((event) => event.type)).toContain("ModelLoadFailed");
  });
});

describe("ModelManager.unload / unloadAll", () => {
  it("releases the session and allows reloading", async () => {
    const { session, runtime, manager } = await setup();
    await manager.ensureLoaded("kokoro-82m");

    await manager.unload("kokoro-82m");
    expect(session.released).toBe(true);
    expect(manager.isLoaded("kokoro-82m")).toBe(false);

    await manager.ensureLoaded("kokoro-82m");
    expect(runtime.createdSessions).toHaveLength(2);
  });

  it("unloadAll releases every loaded model", async () => {
    const { session, manager } = await setup();
    await manager.ensureLoaded("kokoro-82m");

    await manager.unloadAll();

    expect(session.released).toBe(true);
    expect(manager.isLoaded("kokoro-82m")).toBe(false);
  });
});
