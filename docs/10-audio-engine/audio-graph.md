# Audio Graph

> Status: Implemented (Phase 9). `packages/audio/src/audio-graph.ts`, `mixer.ts`.

`Clip -> Gain -> Pan -> Effects -> Track Bus -> Master Bus -> Output`.

## Scope

`buildClipChain(context, options)` realizes one Layer's `Clip -> Gain ->
Pan` segment against an `IAudioContext` (real `AudioContext`/
`OfflineAudioContext`, or `FakeAudioContext` in tests):

- `source` (`AudioBufferSourceNode`): the decoded clip, with `loop` and
  `playbackRate` set from options.
- `gain`: clip volume, matches `IAudioLayer.volume` (`@motion-studio/shared`).
- `pan` (`StereoPannerNode`): -1..1, defaults to center.

`chain.connect(destination)` wires the chain's output (`pan`) onward. If
the layer has effects, the caller connects to the first effect node
instead of straight to the track bus, so the full
`Clip -> Gain -> Pan -> Effects -> Track Bus` order holds — this package
doesn't hardcode that wiring itself, since which effects (if any) apply is
per-layer, per-caller state.

`Mixer` (`mixer.ts`) owns everything from `Track Bus` onward: one bus
(`Gain -> StereoPanner`) per Timeline `TrackId`, feeding a shared master
bus (`Gain -> DynamicsCompressor limiter -> destination`).

## Why this isn't the ADR-005 DAG primitive

Every other "X Graph" in this project (`RenderGraph`, Animation's
blending/constraint evaluator, the Export Graph) is an abstract ordering
problem: build a dependency graph, topologically sort it, then hand the
ordered result to a backend that has no graph model of its own (a GPU
draw-call sequence, an evaluation loop). Web Audio is different — its
native node graph _is_ the execution engine. `.connect()`ing nodes is
already the complete "build the graph" step; the browser's audio
rendering thread does the traversal/scheduling. There's nothing left to
topologically sort, so reusing `Dag<TId>` here would add a layer with no
job to do.

## Open questions

None outstanding for the graph shape itself. See `effects.md` for what's
still unimplemented in the effects stage, and `synchronization.md` for the
tick/`currentTime` resync mechanism that determines _when_ `chain.start()`
is actually called.
