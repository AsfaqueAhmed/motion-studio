import {
  Input,
  Output,
  BlobSource,
  BufferTarget,
  Mp4OutputFormat,
  ALL_FORMATS,
  CanvasSource,
  AudioBufferSource,
  VideoSampleSink,
  AudioBufferSink,
  canEncodeVideo,
  canEncodeAudio,
  QUALITY_HIGH,
} from "mediabunny";

type Result = {
  step: string;
  ok: boolean;
  detail?: string;
  ms?: number;
};

const results: Result[] = [];
(window as any).__SPIKE_RESULTS__ = results;
(window as any).__SPIKE_DONE__ = false;

const logEl = document.getElementById("log")!;
function log(msg: string) {
  console.log(msg);
  logEl.textContent += msg + "\n";
}

function record(step: string, ok: boolean, detail?: string, ms?: number) {
  results.push({ step, ok, detail, ms });
  log(
    `[${ok ? "PASS" : "FAIL"}] ${step}${ms !== undefined ? ` (${ms.toFixed(0)}ms)` : ""}${detail ? " — " + detail : ""}`,
  );
}

async function runPipeline(audioCodec: "opus" | "aac", videoElId: string) {
  const t0 = performance.now();
  try {
    const canEncodeA = await canEncodeAudio(audioCodec, {
      numberOfChannels: 1,
      sampleRate: 44100,
      bitrate: 128_000,
    });
    if (!canEncodeA) {
      record(`canEncodeAudio(${audioCodec})`, false, "browser reports unsupported");
      return;
    }
    record(`canEncodeAudio(${audioCodec})`, true);

    const resp = await fetch("/sample.mp4");
    const blob = await resp.blob();
    const input = new Input({ source: new BlobSource(blob), formats: ALL_FORMATS });

    const videoTrack = await input.getPrimaryVideoTrack();
    const audioTrack = await input.getPrimaryAudioTrack();
    if (!videoTrack || !audioTrack) throw new Error("missing video or audio track in source");

    const width = await videoTrack.getDisplayWidth();
    const height = await videoTrack.getDisplayHeight();

    const canvas = new OffscreenCanvas(width, height);
    const ctx = canvas.getContext("2d")!;

    const output = new Output({
      format: new Mp4OutputFormat(),
      target: new BufferTarget(),
    });

    const videoSource = new CanvasSource(canvas, { codec: "avc", bitrate: QUALITY_HIGH });
    output.addVideoTrack(videoSource, { frameRate: 30 });

    const audioSource = new AudioBufferSource({ codec: audioCodec, bitrate: 128_000 });
    output.addAudioTrack(audioSource);

    await output.start();

    // Video: decode -> draw + overlay (simulated render step) -> encode
    const videoSink = new VideoSampleSink(videoTrack);
    let frameCount = 0;
    for await (const sample of videoSink.samples()) {
      sample.draw(ctx as unknown as CanvasRenderingContext2D, 0, 0);
      // Simulated "rendering": overlay a marker rect + frame counter, proving the
      // render step (not just passthrough) is what gets encoded.
      ctx.fillStyle = "rgba(255, 0, 0, 0.6)";
      ctx.fillRect(8, 8, 48, 48);
      ctx.fillStyle = "white";
      ctx.font = "16px sans-serif";
      ctx.fillText(`#${frameCount}`, 12, 30);

      await videoSource.add(sample.timestamp, sample.duration);
      sample.close();
      frameCount++;
    }
    record(`video decode+render+encode (${audioCodec} run)`, true, `${frameCount} frames`);

    // Audio: decode -> encode (passthrough resample via AudioBuffer)
    const audioSink = new AudioBufferSink(audioTrack);
    let bufferCount = 0;
    for await (const { buffer } of audioSink.buffers()) {
      await audioSource.add(buffer);
      bufferCount++;
    }
    record(`audio decode+encode (${audioCodec})`, true, `${bufferCount} buffers`);

    await output.finalize();

    const outBlob = new Blob([output.target.buffer!], { type: "video/mp4" });
    const url = URL.createObjectURL(outBlob);
    const videoEl = document.getElementById(videoElId) as HTMLVideoElement;
    videoEl.src = url;

    const playResult = await new Promise<boolean>((resolve) => {
      videoEl.onloadeddata = () => resolve(true);
      videoEl.onerror = () => resolve(false);
      setTimeout(() => resolve(false), 8000);
    });

    record(
      `mux + playback (${audioCodec})`,
      playResult,
      `${(outBlob.size / 1024).toFixed(1)} KB`,
      performance.now() - t0,
    );
  } catch (err) {
    record(`pipeline (${audioCodec})`, false, String(err), performance.now() - t0);
  }
}

async function main() {
  record("VideoDecoder available", typeof VideoDecoder !== "undefined");
  record("VideoEncoder available", typeof VideoEncoder !== "undefined");
  record("AudioEncoder available", typeof AudioEncoder !== "undefined");
  record("AudioDecoder available", typeof AudioDecoder !== "undefined");
  record("OffscreenCanvas available", typeof OffscreenCanvas !== "undefined");

  const canH264 = await canEncodeVideo("avc", { width: 640, height: 360, bitrate: QUALITY_HIGH });
  record("canEncodeVideo(avc/H.264)", canH264);

  await runPipeline("opus", "output-opus");
  await runPipeline("aac", "output-aac");

  (window as any).__SPIKE_DONE__ = true;
  log("\n=== DONE ===");
}

main();
