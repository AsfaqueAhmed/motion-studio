---
name: project-phase0-spike-findings
description: Results of the mandatory Phase 0 spikes (export pipeline + in-browser TTS) and how they change the plan
metadata: 
  node_type: memory
  type: project
  originSessionId: 8c3bfdf3-80ce-49f5-b408-a98ac9d4171b
---

Phase 0 spikes both ran for real (not just read about) on 2026-07-06, in
throwaway `spikes/spike-a-export/` and `spikes/spike-b-tts/` dirs (Vite +
Playwright), with findings written into `docs/13-export/`, `docs/11-ai/`,
and `docs/DECISIONS.md` (ADR-012). `PLAN.md`'s M0 milestone is now checked off.

**Spike A (export):** Passed. Decode→canvas-render→encode→mux→playback works
on Chromium/Firefox/WebKit. Firefox confirmed unable to encode AAC (Opus is
the correct default, as `CLAUDE.md` already assumed). Key change: the plan's
`mp4box.js` + `mp4-muxer` dependency pair is replaced by **Mediabunny**
(single library, covers both demux and mux) — `mp4-muxer`'s own maintainer
deprecated it in Mediabunny's favor. Recorded as ADR-012.

**Spike B (TTS, Kokoro-82M via `kokoro-js`):** Pipeline shape confirmed
(single ONNX graph, not multi-stage — matches what `CLAUDE.md` already
assumed). But performance target was **not met**: warm generation of a 10s
sentence took 14.1s on WASM (target was <5s). This is a real open gap, not
resolved — options being weighed are streaming output, lower quantization,
or redesigning the narration UX around a progress indicator instead of
near-instant generation. Real model sizes: 92MB (`q8`, the correct default)
vs. 326MB (`fp32`). A WebGPU run measured 199s (13x slower than WASM) but
that number is very likely a headless/sandboxed-browser artifact (no
confirmed real GPU acceleration) — flagged as unreliable, not a real signal
against WebGPU, needs re-testing on real end-user hardware before deciding.

**Why this matters:** Phase 1 (monorepo scaffold, `PLAN.md` step 1.1) should
use Mediabunny as the Export Engine's container dependency from the start,
not mp4box.js/mp4-muxer. The Export Engine (13) and AI Engine (11) docs now
have real numbers instead of placeholders — read `docs/13-export/webcodecs.md`,
`docs/13-export/muxer.md`, `docs/11-ai/kokoro.md`, and `docs/11-ai/overview.md`
directly for the full data before making dependency or UX decisions in those
areas, since this memory is a summary, not the source of truth.

**How to apply:** When picking up Phase 1 work, don't re-litigate the
Mediabunny vs. mp4box.js/mp4-muxer choice — it's decided (ADR-012). When
building the AI Engine / narration feature, don't assume <5s TTS generation
without first checking whether the streaming-API or lower-quantization
mitigation was decided on — that decision was still open as of this session.
