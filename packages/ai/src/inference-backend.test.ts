import { describe, expect, it } from "vitest";
import { InferenceBackend, resolveInferenceBackend } from "./inference-backend";
import { FakeInferenceCapabilityProbe } from "./test-support/fakes";

describe("resolveInferenceBackend", () => {
  it("prefers WebGPU when available", async () => {
    const probe = new FakeInferenceCapabilityProbe(true);
    await expect(resolveInferenceBackend(probe)).resolves.toBe(InferenceBackend.WebGpu);
  });

  it("falls back to WASM when WebGPU is unavailable", async () => {
    const probe = new FakeInferenceCapabilityProbe(false);
    await expect(resolveInferenceBackend(probe)).resolves.toBe(InferenceBackend.Wasm);
  });

  it("stays on WASM when explicitly preferred, even if WebGPU is available", async () => {
    const probe = new FakeInferenceCapabilityProbe(true);
    await expect(resolveInferenceBackend(probe, InferenceBackend.Wasm)).resolves.toBe(
      InferenceBackend.Wasm,
    );
  });
});
