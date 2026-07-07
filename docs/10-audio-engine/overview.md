# Audio Engine — Overview

> Status: Implemented (Phase 9). `packages/audio`.

Evaluates, mixes, and outputs audio. Consumes Frame State. Does not own
Timeline logic, does not render graphics, does not own files (Assets
Engine's job) — only playback and mixing.

## Architecture

Built on the Web Audio API graph model (not `HTMLAudioElement`, which
can't mix/effect/scrub precisely enough):

```
Clip → Gain → Pan → Effects → Track Bus → Master Bus (Limiter) → Output
```

Every track has its own bus (`Mixer.addTrack`, `mixer.md`); buses feed a
master bus with a limiter to prevent clipping.

Every function in this package that builds part of the graph takes an
`IAudioContext` (`audio-context.ts`) — a minimal, hand-rolled interface
covering only the Web Audio surface actually used (`createGain`,
`createBiquadFilter`, `createDynamicsCompressor`, `createDelay`,
`createConvolver`, `createBufferSource`, etc.), the same
dependency-injection pattern `packages/rendering` uses for
`ICanvas2DContext`/`IGPUDevice`. A real browser `AudioContext` or
`OfflineAudioContext` structurally satisfies it without any adapter code,
and tests inject `FakeAudioContext` (`test-support/fake-audio-context.ts`)
instead of needing a real audio device.

Audio's own graph is **not** an instance of the ADR-005 generic DAG
primitive, unlike the Render Graph. Web Audio's native graph is itself the
execution engine — the browser schedules and runs `.connect()`ed nodes —
so there's no separate "topologically order these nodes, then hand them
to a backend" step the way `RenderGraph`/`orderEffectChain` need for GPU
backends that have no native graph of their own. See `audio-graph.ts`'s
module doc.

## Synchronization — real, resolved this phase

Philosophy: "no independent audio clock, driven by Timeline ticks." In
practice, Web Audio's actual scheduling primitive is
`AudioContext.currentTime` — a continuous hardware clock, genuinely
different from the Timeline's integer-tick clock. `AudioClockSync`
(`synchronization.ts`) implements the explicit resync strategy this
needed: anchor one `(tick, currentTime)` pair at play/seek, convert every
subsequent tick against that anchor, and re-anchor once observed drift
crosses a threshold (15ms default) rather than letting per-conversion
rounding accumulate over a long (2h+) project. `AudioTransport`
(`playback.ts`) wires this to Core's `Scheduler.onAudioSync(tick)`
per-frame handler — see `synchronization.md`.

## Preview vs. export use different Web Audio APIs

Live playback: realtime `AudioContext`, via `AudioEngine.attachRealtimeContext`.
Export: `OfflineAudioContext`, via `AudioEngine.buildOfflineMixer`.
"Preview and export use the exact same processing graph" is achieved
because `buildClipChain`/`Mixer`/every native effect factory in
`effects.ts` take the shared `IAudioContext` interface, not a concrete
browser type — the same graph-construction code runs against either
context. The two `Mixer` instances are independent (Web Audio nodes are
bound to the context that created them), but built from identical code.
This holds for future AudioWorklet-based effects too, as long as their
processor scripts are written to work correctly under both.

## Effects — corrected from the original draft

The original draft of this doc grouped **EQ, Compressor, Limiter, Noise
Gate** together as "native Web Audio nodes." That was wrong for Noise
Gate: `DynamicsCompressorNode` only compresses _above_ a threshold, it
cannot silence audio _below_ one — a true gate needs a per-sample
threshold/hysteresis decision no native node expresses. Corrected split,
see `effects.md`:

- **Native** (`BiquadFilterNode`/`DynamicsCompressorNode`/`DelayNode`/
  `ConvolverNode`): EQ, Compressor, Limiter, Delay, Reverb.
- **AudioWorklet-only** (custom per-sample DSP, not implemented this
  pass — see `effects.md`): Noise Gate, Pitch Shift, Speed.

## Generated voice

AI-generated speech is treated identically to any other audio clip once
produced — the Audio Engine never knows or cares whether a clip's source
was recorded or AI-generated.

## Ducking — designed in, per design-review recommendation

`Mixer.duckTrack` schedules a linear gain ramp on a track's existing bus
gain node. Not a separate subsystem — see `mixer.md`.

## Performance goals

<10ms latency, <1ms sync drift (the resync strategy above is what makes
this achievable at scale/duration), 100 simultaneous tracks in real time,
<20% CPU. Not yet benchmarked against real audio hardware/decoded media —
this phase implements the graph and sync mechanics, not a real-media
integration test.
