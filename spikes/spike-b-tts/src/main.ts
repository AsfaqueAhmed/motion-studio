import { KokoroTTS } from "kokoro-js";

const results: Record<string, unknown> = {};
(window as any).__SPIKE_RESULTS__ = results;
(window as any).__SPIKE_DONE__ = false;

const logEl = document.getElementById("log")!;
function log(msg: string) {
  console.log(msg);
  logEl.textContent += msg + "\n";
}

const params = new URLSearchParams(location.search);
const device = (params.get("device") as "wasm" | "webgpu") ?? "wasm";
const dtype = params.get("dtype") ?? "q8";

const MODEL_ID = "onnx-community/Kokoro-82M-v1.0-ONNX";

// ~10s of speech at a natural reading pace (roughly 25-30 words).
const TEST_SENTENCE =
  "The quick brown fox jumps over the lazy dog while the old clock on the wall ticks steadily through the quiet afternoon, marking each passing second with patience.";

function bytesTransferredForModel(): number {
  const entries = performance.getEntriesByType("resource") as PerformanceResourceTiming[];
  return entries
    .filter((e) => /huggingface\.co|hf\.co|jsdelivr/.test(e.name))
    .reduce((sum, e) => sum + (e.transferSize || e.encodedBodySize || 0), 0);
}

function distinctModelFiles(): string[] {
  const entries = performance.getEntriesByType("resource") as PerformanceResourceTiming[];
  return [
    ...new Set(
      entries
        .filter((e) => /\.onnx(\?|$)/.test(e.name))
        .map((e) => e.name.split("/").pop()!.split("?")[0]),
    ),
  ];
}

async function main() {
  log(`device=${device} dtype=${dtype}`);
  results["device"] = device;
  results["dtype"] = dtype;
  results["webgpuAvailable"] = typeof (navigator as any).gpu !== "undefined";
  if (results["webgpuAvailable"]) {
    try {
      const adapter = await (navigator as any).gpu.requestAdapter();
      results["webgpuAdapterInfo"] = adapter?.info ?? null;
      results["webgpuIsFallback"] = adapter?.isFallbackAdapter ?? null;
    } catch (e) {
      results["webgpuAdapterError"] = String(e);
    }
  }

  const t0 = performance.now();
  let tts: KokoroTTS;
  try {
    tts = await KokoroTTS.from_pretrained(MODEL_ID, { dtype: dtype as any, device });
  } catch (err) {
    results["loadError"] = String(err);
    log(`[FAIL] model load — ${err}`);
    (window as any).__SPIKE_DONE__ = true;
    return;
  }
  const loadMs = performance.now() - t0;
  results["loadMs"] = loadMs;
  results["modelBytesTransferred"] = bytesTransferredForModel();
  results["modelFiles"] = distinctModelFiles();
  log(
    `[PASS] model loaded in ${loadMs.toFixed(0)}ms, ${(bytesTransferredForModel() / 1e6).toFixed(2)}MB over network, files: ${distinctModelFiles().join(", ")}`,
  );

  const t1 = performance.now();
  try {
    const audio = await tts.generate(TEST_SENTENCE, { voice: "af_heart" });
    const genMs = performance.now() - t1;
    const durationSec = audio.audio.length / audio.sampling_rate;
    results["generateMs"] = genMs;
    results["audioDurationSec"] = durationSec;
    results["sampleRate"] = audio.sampling_rate;
    log(
      `[PASS] generated ${durationSec.toFixed(2)}s of audio in ${genMs.toFixed(0)}ms (sampleRate=${audio.sampling_rate})`,
    );

    const blob = audio.toBlob();
    const audioEl = document.getElementById("output") as HTMLAudioElement;
    audioEl.src = URL.createObjectURL(blob);
  } catch (err) {
    results["generateError"] = String(err);
    log(`[FAIL] generate — ${err}`);
  }

  (window as any).__SPIKE_DONE__ = true;
  log("\n=== DONE ===");
}

main();
