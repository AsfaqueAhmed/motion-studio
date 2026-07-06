# Audio Engine — Overview

Evaluates, mixes, and outputs audio. Consumes Frame State. Does not own
Timeline logic, does not render graphics, does not own files (Assets
Engine's job) — only playback and mixing.

## Architecture

Built on the Web Audio API graph model (not `HTMLAudioElement`, which
can't mix/effect/scrub precisely enough):

```
Clip → Gain → Pan → Effects → Track Bus → Master Bus (Limiter) → Output
```

Every track has its own bus; buses feed a master bus with a limiter to
prevent clipping.

## Synchronization — real, open risk

Philosophy: "no independent audio clock, driven by Timeline ticks." In
practice, Web Audio's actual scheduling primitive is
`AudioContext.currentTime` — a continuous hardware clock, genuinely
different from the Timeline's integer-tick clock. Precise playback means
converting tick → `currentTime` on every scheduled node, and over long
(2h+) projects, small per-conversion rounding can accumulate into
audible drift. **This needs an explicit periodic resync strategy**, not
just "driven by ticks" as a philosophy statement. See `synchronization.md`.

## Preview vs. export use different Web Audio APIs

Live playback: realtime `AudioContext`. Export: `OfflineAudioContext`
(renders as fast as possible, different timing semantics). "Preview and
export use the exact same processing graph" is achievable, but only if
every custom/plugin effect node is written to work correctly under both
— this is a real implementation constraint, not automatic.

## Effects

EQ, Compressor, Limiter, Noise Gate: native Web Audio nodes
(`BiquadFilterNode`, `DynamicsCompressorNode`). **Pitch Shift and Speed
are not native** — they require custom DSP (typically a phase vocoder)
via `AudioWorklet` (the modern, non-deprecated custom-audio-processing
API — not the older `ScriptProcessorNode`).

## Generated voice

AI-generated speech is treated identically to any other audio clip once
produced — the Audio Engine never knows or cares whether a clip's source
was recorded or AI-generated.

## Recommendation carried from design review

Ducking (auto-lowering music under narration) is filed elsewhere as a
"future" feature, but is a headline feature for this category of app —
worth designing into the bus/routing model now rather than retrofitting.

## Performance goals

<10ms latency, <1ms sync drift (needs the resync strategy above to
actually hold at scale/duration), 100 simultaneous tracks in real time,
<20% CPU.
