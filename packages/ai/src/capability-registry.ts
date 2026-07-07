import type { AICapability } from "@motion-studio/shared";
import type { InferenceBackend } from "./inference-backend";

/**
 * `docs/11-ai/overview.md` "Capability Registry": each capability declares
 * required inputs/outputs, preferred runtime, and estimated resource cost.
 * Registration is optional — providers can register without a descriptor,
 * same as how `AssetDependencyGraph` tolerates references that never get a
 * matching entry.
 */
export interface ICapabilityDescriptor {
  readonly capability: AICapability;
  readonly requiredInputs: readonly string[];
  readonly outputs: readonly string[];
  readonly preferredBackend: InferenceBackend;
  readonly estimatedResourceCost: "low" | "medium" | "high";
}

/**
 * Minimal shape every capability provider satisfies — `ITTSProvider`
 * (`tts-provider.ts`) is the first concrete extension of this. A capability
 * may have multiple interchangeable providers (`docs/11-ai/provider-system.md`:
 * "Each capability may be satisfied by multiple interchangeable models"),
 * e.g. Kokoro and Piper both satisfying `TextToSpeech`.
 */
export interface ICapabilityProvider {
  readonly id: string;
  readonly capability: AICapability;
  readonly modelId: string;
}

export class NoCapabilityProviderError extends Error {
  constructor(capability: AICapability) {
    super(`CapabilityRegistry: no provider registered for capability "${capability}"`);
    this.name = "NoCapabilityProviderError";
  }
}

export class CapabilityProviderNotFoundError extends Error {
  constructor(capability: AICapability, providerId: string) {
    super(
      `CapabilityRegistry: no provider "${providerId}" registered for capability "${capability}"`,
    );
    this.name = "CapabilityProviderNotFoundError";
  }
}

/**
 * "Feature → Capability Registry → Inference Platform → Backend → Model →
 * Result" (`docs/11-ai/overview.md`). Features ask for a capability
 * (`AICapability.TextToSpeech`), never a specific model — this is the
 * indirection that lets Kokoro be swapped for Piper without touching editor
 * code.
 */
export class CapabilityRegistry {
  private readonly descriptors = new Map<AICapability, ICapabilityDescriptor>();
  private readonly providers = new Map<AICapability, ICapabilityProvider[]>();

  registerDescriptor(descriptor: ICapabilityDescriptor): void {
    this.descriptors.set(descriptor.capability, descriptor);
  }

  getDescriptor(capability: AICapability): ICapabilityDescriptor | undefined {
    return this.descriptors.get(capability);
  }

  registerProvider(provider: ICapabilityProvider): void {
    const existing = this.providers.get(provider.capability) ?? [];
    this.providers.set(provider.capability, [
      ...existing.filter((entry) => entry.id !== provider.id),
      provider,
    ]);
  }

  unregisterProvider(capability: AICapability, providerId: string): void {
    const existing = this.providers.get(capability);
    if (!existing) {
      return;
    }
    this.providers.set(
      capability,
      existing.filter((entry) => entry.id !== providerId),
    );
  }

  getProviders(capability: AICapability): readonly ICapabilityProvider[] {
    return this.providers.get(capability) ?? [];
  }

  /** First-registered provider by default, or a specific `providerId` — throws rather than silently picking an arbitrary provider when one is requested by name. */
  resolveProvider(capability: AICapability, providerId?: string): ICapabilityProvider {
    const candidates = this.getProviders(capability);
    if (providerId === undefined) {
      const first = candidates[0];
      if (!first) {
        throw new NoCapabilityProviderError(capability);
      }
      return first;
    }
    const match = candidates.find((entry) => entry.id === providerId);
    if (!match) {
      throw new CapabilityProviderNotFoundError(capability, providerId);
    }
    return match;
  }
}
