# Effects

> Status: Partially implemented (Phase 9). `packages/audio/src/effects.ts`.

EQ, Compressor, Limiter, Reverb, Delay implemented natively this phase.
Noise Gate, Pitch Shift, Speed require `AudioWorklet` DSP not implemented
this phase (see below) — `overview.md`'s original draft grouped Noise
Gate with the native set; that was wrong and is corrected here.

## Scope — implemented, native

All of these take the shared `IAudioContext` (`audio-context.ts`), so they
run identically under realtime and offline rendering:

- `createEqChain(context, bands)` — N-band parametric EQ, a chain of
  `BiquadFilterNode`s (`lowshelf`/`highshelf`/`peaking`). Throws on an
  empty band list.
- `createCompressorNode(context, params)` — general-purpose
  `DynamicsCompressorNode` wrapper with sensible defaults
  (threshold -24dB, ratio 12:1, knee 30dB).
- `createLimiterNode(context, thresholdDb)` — same node type, tuned hard
  (20:1 ratio, ~1ms attack, zero knee). Also what `Mixer`'s master bus
  uses internally.
- `createDelayNode(context, delaySeconds, maxDelaySeconds)` — native
  `DelayNode`, throws if `delaySeconds` is out of `[0, maxDelaySeconds]`.
- `createReverbChain(context, impulseResponse, wetMix)` — native
  `ConvolverNode` driven by a caller-supplied impulse response
  (`IAudioBuffer`), wet/dry mixed through two gain nodes. This package
  doesn't synthesize impulse responses — that's an Assets-catalog concern,
  same split as `waveform.md` not generating waveforms itself.

## Scope — not implemented: AudioWorklet DSP

Noise Gate, Pitch Shift, and Speed all need real per-sample DSP a native
node graph cannot express:

- **Noise Gate** needs a dynamic per-sample threshold/hysteresis decision
  (silence below a threshold, pass above it) — `DynamicsCompressorNode`
  only compresses _above_ its threshold, it has no "cut below" behavior,
  so it cannot implement a true gate no matter how it's tuned.
- **Pitch Shift** and **Speed** need a phase vocoder (STFT → bin
  manipulation → overlap-add), CLAUDE.md's "Known hard risks" territory.

`createAudioWorkletEffectNode(context, options)` is the real, working
extension point: it calls `context.audioWorklet.addModule(moduleUrl)`
then `context.createAudioWorkletNode(processorName, ...)` against a
caller-supplied processor script. What's missing is the processor script
itself (the actual gate/phase-vocoder algorithm) — writing a correct
phase vocoder is its own project, not something to fake with placeholder
math that would silently produce wrong audio. `IAudioWorkletContext`/
`IAudioWorkletNode` (`audio-context.ts`) and `FakeAudioWorkletContext`
(`test-support/fake-audio-context.ts`) exist and are tested; only the DSP
inside the worklet module is open.

## Open questions

- Noise Gate / Pitch Shift / Speed DSP algorithms — not designed yet,
  need a dedicated pass (see above).
- No `AudioEffectType` cross-package coupling exists yet the way
  Effects' `EffectType` structurally matches Rendering's `IRenderGraphNode`
  — audio effects aren't consumed by another engine today, so
  `AudioEffectType` (`effects.ts`) stays package-local until something
  needs otherwise (e.g. an Inspector effect-chain UI in Phase 17).
