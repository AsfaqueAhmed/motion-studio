/**
 * Backend choice the AI Engine actually resolves between — kept local to
 * this package (unlike `AICapability`, which lives in `@motion-studio/shared`
 * because it's referenced by the event catalog), matching
 * `packages/export/src/codecs.ts`'s `VideoCodec`/`ContainerFormat` precedent:
 * nothing outside AI needs to know which execution provider ran a model.
 *
 * `docs/11-ai/overview.md`: "ONNX Runtime Web on WebGPU (fast path), ONNX
 * Runtime Web on WASM (fallback)". Spike B (`docs/11-ai/kokoro.md`) measured
 * WebGPU as *slower* than WASM in its headless test harness, but flagged
 * that result as unreliable (likely a software-GPU fallback in the
 * automated browser, not a real signal) — so WebGPU stays the preferred
 * backend here pending re-validation on real hardware, per that doc's
 * "Open questions".
 */
export enum InferenceBackend {
  WebGpu = "webgpu",
  Wasm = "wasm",
}

/**
 * Hand-rolled and injected rather than reading `navigator.gpu` directly, so
 * tests can fake availability without a real browser — same DI pattern as
 * `packages/export/src/codecs.ts`'s `IEncodeCapabilityProbe` and
 * `packages/audio/src/audio-context.ts`'s `IAudioContext`.
 */
export interface IInferenceCapabilityProbe {
  isWebGpuAvailable(): Promise<boolean>;
}

export class UnsupportedInferenceBackendError extends Error {
  constructor() {
    super("InferenceBackend: no supported execution provider found (tried: webgpu, wasm)");
    this.name = "UnsupportedInferenceBackendError";
  }
}

/**
 * WebGPU EP primary, WASM EP fallback (PLAN.md Phase 13). WASM is ONNX
 * Runtime Web's universal execution provider — if `preferred` is WASM
 * already, or WebGPU is unavailable, WASM is always the resolved backend
 * (there is no further fallback below it, unlike Export's codec chains
 * which can genuinely exhaust every option).
 */
export async function resolveInferenceBackend(
  probe: IInferenceCapabilityProbe,
  preferred: InferenceBackend = InferenceBackend.WebGpu,
): Promise<InferenceBackend> {
  if (preferred === InferenceBackend.WebGpu && (await probe.isWebGpuAvailable())) {
    return InferenceBackend.WebGpu;
  }
  return InferenceBackend.Wasm;
}

/**
 * Structurally matches `onnxruntime-web`'s (and `@huggingface/transformers`'
 * re-export of the same) `Tensor` class — `new Tensor(type, data, dims)` —
 * confirmed against the vendored `kokoro-js` build used by Spike B
 * (`spikes/spike-b-tts/node_modules/kokoro-js/dist/kokoro.js`), e.g.
 * `new Tensor("float32", styleVector, [1, 256])`. No real `onnxruntime-web`
 * dependency is added yet — same "engine exists, integration is later" gap
 * as Export's Mediabunny DI (`packages/export/src/container.ts`).
 */
export interface IInferenceTensor {
  readonly type: string;
  readonly data: Float32Array | Int32Array | BigInt64Array | readonly string[];
  readonly dims: readonly number[];
}

/**
 * Structurally matches `onnxruntime-web`'s `InferenceSession`:
 * `run(feeds) -> Promise<Record<string, Tensor>>`, `release()`.
 */
export interface IInferenceSession {
  run(feeds: Record<string, IInferenceTensor>): Promise<Record<string, IInferenceTensor>>;
  release(): Promise<void>;
}

/**
 * Structurally matches `onnxruntime-web`'s `InferenceSession.create(bytes,
 * options)`, with the resolved `InferenceBackend` standing in for the real
 * `executionProviders` option array.
 */
export interface IOnnxRuntime {
  createSession(modelBytes: Uint8Array, backend: InferenceBackend): Promise<IInferenceSession>;
}
