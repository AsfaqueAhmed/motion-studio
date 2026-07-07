# Provider System

> Status: Implemented (Phase 13, 2026-07-07). See `packages/ai/src/capability-registry.ts`, `tts-provider.ts`.

Capability Registry: `TextToSpeech`, `BackgroundRemoval`, `UpscaleImage`,
etc. (`AICapability`, `@motion-studio/shared`). Each capability may be
satisfied by multiple interchangeable providers — implemented as
`CapabilityRegistry.registerProvider()` accepting many `ICapabilityProvider`
per capability, keyed by provider `id`.

## `ICapabilityProvider` / `ICapabilityDescriptor`

```ts
interface ICapabilityProvider {
  readonly id: string;
  readonly capability: AICapability;
  readonly modelId: string;
}

interface ICapabilityDescriptor {
  readonly capability: AICapability;
  readonly requiredInputs: readonly string[];
  readonly outputs: readonly string[];
  readonly preferredBackend: InferenceBackend;
  readonly estimatedResourceCost: "low" | "medium" | "high";
}
```

Descriptors are registered independently of providers
(`registerDescriptor`) — a capability can be documented before anything
implements it, matching how `AICapability` already listed
`BackgroundRemoval`/`UpscaleImage`/etc. before this phase gave any of them
a real provider.

## `ITTSProvider` (`tts-provider.ts`)

The first concrete `ICapabilityProvider` extension:

```ts
interface ITTSProvider extends ICapabilityProvider {
  readonly capability: AICapability.TextToSpeech;
  synthesize(text: string, voiceId: string): Promise<ISynthesizedAudio>;
}
```

Two implementations this phase: `KokoroProvider` (`kokoro.md`,
grounded in Spike B's confirmed tensor shapes) and `PiperProvider`
(`piper.md`, unverified tensor names pending Piper's own spike). Both
share the same `ITTSProvider` shape, so `AIManager.synthesizeSpeech()`
never branches on which one is installed.

## Resolution

`CapabilityRegistry.resolveProvider(capability, providerId?)`:
first-registered provider by default, or an exact match by `providerId`.
Throws `NoCapabilityProviderError` / `CapabilityProviderNotFoundError`
rather than silently returning `undefined` — mirrors
`AssetManager.delete()`'s "throw, don't silently no-op" precedent.

## Open questions

- **Provider ranking beyond "first registered."** No cost/quality-based
  auto-selection exists — if multiple `TextToSpeech` providers are
  registered, whichever registered first wins unless a caller names one
  explicitly. Not required by PLAN.md Phase 13's checklist.
- **`BackgroundRemoval`/`UpscaleImage`/etc. providers.** Explicitly
  post-MVP per PLAN.md Phase 13 ("Background removal ... post-MVP") — no
  provider exists for any non-`TextToSpeech` capability yet.
