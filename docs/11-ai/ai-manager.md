# Ai Manager

> Status: Implemented (Phase 13, 2026-07-07). See `packages/ai/src/ai-manager.ts`.

Task queue, priority scheduling, worker dispatch — as originally scoped.
**Only the orchestration itself is implemented; the queue, scheduling, and
worker dispatch are not.** Every `AIManager` call runs synchronously on the
caller's thread, same "engine exists, integration is later" gap as
Export's job runner (`packages/export/src/export-job.ts`) and Assets'
import pipeline both running on the caller's thread rather than a Worker.

## `AIManager` (`ai-manager.ts`)

`IEngine` facade tying `CapabilityRegistry` + `ModelManager` + registered
`ITTSProvider`s together — matches `AssetManager`/`ExportEngine`'s split
(engine class owns lifecycle + orchestration bookkeeping, standalone
classes own the actual logic: `ModelManager`, `CapabilityRegistry`,
`KokoroProvider`/`PiperProvider`).

- `registerCapability(descriptor)` / `registerTTSProvider(provider)` →
  forward to the `CapabilityRegistry`.
- `synthesizeSpeech(taskId, text, voiceId, providerId?)` → resolves an
  `ITTSProvider` via the registry, calls `synthesize()`, emits
  `InferenceCompleted`/`InferenceFailed` (added to
  `@motion-studio/shared`'s event catalog this phase) through an injected
  `IAIEventSink` — same generic-emit-shape pattern as
  `IExportEventSink`/`IAssetEventSink`. `taskId` is caller-supplied
  (matching Export's caller-supplied `jobId`) so a future task queue can
  correlate events without `AIManager` generating or tracking ids itself.
- `enhanceVoice(audio, enhancerId)` → looks up a registered
  `IVoiceEnhancer` (`voice-enhancer.md`) and applies it; throws if none is
  registered under that id. Always a separate, explicit call — never run
  implicitly inside `synthesizeSpeech`.
- `dispose()` → `ModelManager.unloadAll()`.

## Never does

Queue or prioritize concurrent inference tasks (every call runs
immediately), dispatch to a Worker, or import `@motion-studio/assets`
(see `voice-cache.md` for why handing synthesized audio to Assets is the
caller's job, not `AIManager`'s).

## Open questions

- **Task queue / priority scheduling / worker dispatch.** The entire
  original scope of this doc's title — not implemented. Needed before
  concurrent TTS/inference requests can be rate-limited or prioritized.
- **Cancellation.** Unlike `ExportEngine.cancel(jobId)`, there is no way to
  cancel an in-flight `synthesizeSpeech()` call — `ITTSProvider.synthesize`
  takes no `AbortSignal`. Not required by PLAN.md Phase 13's checklist.
