---
name: project-phase9-audio-engine
description: "Phase 9 Audio Engine decisions — IAudioContext DI pattern, Mixer/audio-graph/effects/sync API shapes, corrected Noise Gate doc claim, AudioWorklet DSP left open"
metadata: 
  node_type: memory
  type: project
  originSessionId: d67e2358-58e8-4268-b434-78a0b70ab71f
---

Phase 9 (`packages/audio`) is complete as of 2026-07-07, branch
`phase-9-audio-engine` off `phase-8-effects-engine`. 51 tests passing,
repo-wide build/typecheck/lint clean.

**Why:** Next phase in `PLAN.md` build order after
[[project_phase8_effects_engine]]. Audio Engine owns Web Audio graph
construction, mixing, and tick<->`currentTime` sync — CLAUDE.md's "Known
hard risks" #5 flagged the sync problem as a real open risk needing an
explicit resync strategy, not just a philosophy statement.

**Key shapes** (`packages/audio/src/`):
- `audio-context.ts` — hand-rolled minimal `IAudioContext`/node interfaces
  (not lib.dom's `AudioContext`), same DI pattern as Rendering's
  `ICanvas2DContext`/`IGPUDevice`. A real `AudioContext`/
  `OfflineAudioContext` structurally satisfies it; tests use
  `FakeAudioContext` (`test-support/`).
- `audio-graph.ts` — `buildClipChain`: Clip->Gain->Pan. Deliberately NOT
  built on ADR-005's generic DAG primitive — Web Audio's native graph
  *is* the execution engine (browser schedules `.connect()`ed nodes), so
  there's no separate topological-order step the way RenderGraph needs
  for GPU backends with no native graph of their own.
- `mixer.ts` — `Mixer`: one master bus (limiter) + one bus per `TrackId`
  (reused existing branded id, no new id type added). Mute layers on top
  of volume (doesn't overwrite it). `duckTrack` — ducking designed in per
  a carried-forward design-review recommendation in `overview.md`.
- `effects.ts` — EQ/Compressor/Limiter/Delay/Reverb are real native Web
  Audio node graphs. Noise Gate/Pitch Shift/Speed are AudioWorklet-only —
  `createAudioWorkletEffectNode` is real registration/instantiation
  plumbing, but no actual phase-vocoder/gate DSP was written (that's its
  own project, would be wrong to fake). **Corrected** `overview.md`'s
  original claim that Noise Gate is native — it isn't, no native node
  expresses a per-sample gate.
- `synchronization.ts` — `AudioClockSync`: anchor `(tick, currentTime)` at
  play/seek, re-anchor (hard, not gradual) once drift exceeds 15ms
  default threshold. This is the resolved answer to the CLAUDE.md open
  risk.
- `playback.ts` — `AudioTransport` wires `AudioClockSync` to Core's
  `Scheduler.onAudioSync(tick)` handler (that hook already existed in
  `packages/core/src/scheduler.ts` since Phase 2, unused until now).
- `audio-engine.ts` — `AudioEngine` facade; realtime session via
  `attachRealtimeContext`, export via `buildOfflineMixer` (independent
  `Mixer`, same construction code, per "preview/export use the exact same
  processing graph").

**Still open** (flagged in docs, not hidden): AudioWorklet DSP for Noise
Gate/Pitch Shift/Speed; no wiring yet to real Timeline `ITrackItem`s or
decoded `AudioBuffer`s from real assets (same "engine exists, integration
later" gap as [[project_phase7_rendering_engine]]/[[project_phase8_effects_engine]]
backend wiring). Next phase per `PLAN.md`: Phase 10, Export Engine
(`packages/export`), which needs Spike A's findings — see
[[project_phase0_spike_findings]].
