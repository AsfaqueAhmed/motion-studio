# Voice Cache

> Status: Implemented as a deliberate non-feature (Phase 13, 2026-07-07).

Generated audio is cached and treated as ordinary media once produced —
this phase implements that by _not_ building a separate cache. `AIManager
.synthesizeSpeech()`/`ITTSProvider.synthesize()` return an
`ISynthesizedAudio` (`tts-provider.ts`) and stop there. Handing that result
to the Asset Manager as an ordinary imported asset (so it gets a content
hash, dedup, and a catalog entry like any other imported clip) is the
caller's job — the future Editor Service layer — not this package's:
`packages/ai` has no dependency on `@motion-studio/assets` and never will,
per CLAUDE.md's "UI never calls an engine directly" / engines-never-import-
each-other's-concretes rule extended to engine-to-engine calls generally.

## `ISynthesizedAudio` (`tts-provider.ts`)

```ts
interface ISynthesizedAudio {
  readonly sampleRate: number;
  readonly numberOfChannels: number;
  readonly durationSeconds: number;
  readonly channelData: readonly Float32Array[];
}
```

A hand-rolled structural subset of the real `AudioBuffer` (not `lib.dom`'s
type, for the same DI reasons `packages/audio/src/audio-context.ts` has
its own `IAudioBuffer`) — enough for a caller to wrap into a real
`AudioBuffer` via `audioContext.createBuffer()` + `copyToChannel()`, or to
encode directly to a file for import.

## Open questions

- **Who actually imports synthesized audio into Assets, and when?** Not
  designed — depends on the future Editor Service / command-handler layer
  that both AI and Assets sit behind, which doesn't exist yet (same gap as
  every cross-engine orchestration question flagged since Phase 10).
- **Caching identical `(text, voice, provider)` requests** to skip
  re-synthesis — not implemented; every `synthesizeSpeech()` call re-runs
  inference even for repeated input.
