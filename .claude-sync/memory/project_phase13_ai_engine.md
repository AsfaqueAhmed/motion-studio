---
name: project-phase13-ai-engine
description: "Phase 13 AI Engine decisions — CapabilityRegistry, ONNX Runtime DI, ModelManager, Kokoro/Piper providers, tensor shapes confirmed via vendored kokoro-js source"
metadata: 
  node_type: memory
  type: project
  originSessionId: c60785ac-da70-4b0d-8b32-fb567afa30ef
---

Phase 13 (AI Engine, `packages/ai`) complete 2026-07-07, branch
`phase-13-ai-engine` off [[project_phase12_asset_manager]]'s branch. Follows
the same "engine exists, integration is later" DI pattern as every prior
phase: no real `onnxruntime-web`, no real OPFS/model store, no real
`phonemizer`/`kokoro-js` dependency added.

**Architecture**: `AIManager` (IEngine facade) → `CapabilityRegistry`
(register/resolve `ITTSProvider`s by `AICapability`) → `ModelManager`
(download→verify→store→load→unload, DI: `IModelBlobStore`,
`IModelDownloader`, `IOnnxRuntime`) → `KokoroProvider`/`PiperProvider`.

**Key finding**: decompiled the vendored `kokoro-js` build already sitting
in `spikes/spike-b-tts/node_modules/kokoro-js/dist/kokoro.js` (from Spike
B) to get *real* confirmed tensor shapes instead of guessing — output
sample rate is 24000 Hz always, inputs are `input_ids`/`style`(`[1,256]`)/
`speed`(`[1]`), output is `waveform`, and the per-voice style vector offset
is `256 * clamp(tokenCount-2, 0, 509)`. This is documented in
`docs/11-ai/kokoro.md`'s new "Implementation (Phase 13)" section. Piper got
the same architecture but placeholder tensor names since it was never
spiked — flagged explicitly as unverified in `docs/11-ai/piper.md`.

**Why**: When implementing a phase whose docs/spike findings reference
vendored throwaway spike code still present in the repo, decompile/grep it
for real API shapes before hand-waving a plausible-sounding DI interface —
it turns a guess into a confirmed fact and is usually just one `grep`/read
away.

**How to apply**: For future AI Engine work (BackgroundRemoval, other
capabilities), check `spikes/` for any vendored library source before
designing that provider's tensor interface from memory/assumption.

Background removal capability explicitly left unimplemented (PLAN.md
itself labels it "post-MVP"). Task queue/priority scheduling/worker
dispatch (ai-manager.md's original doc scope) also not implemented — same
gap as Export/Assets running on the caller's thread.
