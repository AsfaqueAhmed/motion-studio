# Ai Api

> Status: Implemented (Phase 14, `packages/plugin/src/ai-capability-api.ts`).

## Shape

```typescript
interface IPluginCapabilityDescriptor {
  readonly capability: AICapability; // from @motion-studio/shared — common ground
  readonly requiredInputs: readonly string[];
  readonly outputs: readonly string[];
  readonly preferredBackend: string; // AI's InferenceBackend, as a string
  readonly estimatedResourceCost: "low" | "medium" | "high";
}

interface IPluginCapabilityProvider {
  readonly id: string;
  readonly capability: AICapability;
  readonly modelId: string;
}

interface IAICapabilityAPI {
  registerCapability(descriptor: IPluginCapabilityDescriptor): void;
  registerProvider(provider: IPluginCapabilityProvider): void;
  unregisterProvider(capability: AICapability, providerId: string): void;
}
```

Mirrors AI's real `ICapabilityDescriptor`/`ICapabilityProvider`
(`packages/ai/src/capability-registry.ts`). `AICapability` is imported
from `@motion-studio/shared` (already common ground across every
package), but `preferredBackend` is a plain string rather than AI's
`InferenceBackend` enum, for the same reason Export's codec fields are
strings — `InferenceBackend` is package-local to `@motion-studio/ai`
(`inference-backend.ts`), and Plugin cannot import it without breaking
the one-dependency-only rule.

## What's not wired up

No concrete `IAICapabilityAPI` implementation exists in this package —
same gap as `IEffectsAPI`. A real implementation would live wherever a
real `CapabilityRegistry` (`packages/ai/src/capability-registry.ts`)
instance already lives, adapting `registerProvider`/`registerCapability`
calls into `CapabilityRegistry.registerProvider`/`registerDescriptor`,
and resolving `preferredBackend: string` against AI's real
`InferenceBackend` enum (or rejecting unrecognized values).

No built-in AI-capability plugin was written this phase — unlike the
Select-tool and default-export-preset built-ins, there's no "obviously
safe, purely data-shaped" AI capability to register as a demo (registering
Kokoro/Piper as plugins would mean duplicating `packages/ai/src/kokoro-provider.ts`'s
real tensor-shape logic as plugin-side data, which isn't a reasonable
thing to fork).

## Open questions

- Should a plugin be able to register a _provider_ for an existing
  capability (e.g. adding a third TTS engine alongside Kokoro/Piper)
  without also registering a _descriptor_ — mirroring
  `CapabilityRegistry.registerProvider`'s existing tolerance for
  registration without a matching descriptor (`capability-registry.ts`:
  "Registration is optional")? Presumably yes, by the same reasoning, but
  unverified against a real integration.
- Model loading: `IPluginCapabilityProvider` only carries a `modelId`
  string — a plugin providing a genuinely new AI capability would also
  need a way to get its model bytes into `ModelManager`'s `IModelBlobStore`
  (`packages/ai/src/model-manager.ts`). No such path exists in
  `IAICapabilityAPI` today.
