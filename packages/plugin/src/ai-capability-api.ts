import type { AICapability } from "@motion-studio/shared";

/**
 * Structurally mirrors AI's `ICapabilityDescriptor` (`packages/ai/src/capability-registry.ts`)
 * — `preferredBackend` is a plain string here rather than AI's `InferenceBackend`
 * enum, which (like Export's codec enums) is package-local, not shared. See
 * `export-api.ts` for why: nothing outside AI needs to know the execution
 * provider taxonomy, only the capability id.
 */
export interface IPluginCapabilityDescriptor {
  readonly capability: AICapability;
  readonly requiredInputs: readonly string[];
  readonly outputs: readonly string[];
  readonly preferredBackend: string;
  readonly estimatedResourceCost: "low" | "medium" | "high";
}

/** Structurally mirrors AI's `ICapabilityProvider`. */
export interface IPluginCapabilityProvider {
  readonly id: string;
  readonly capability: AICapability;
  readonly modelId: string;
}

/** Public surface a plugin sees for the AI Engine's Capability Registry — see docs/16-plugin-system/ai-api.md. */
export interface IAICapabilityAPI {
  registerCapability(descriptor: IPluginCapabilityDescriptor): void;
  registerProvider(provider: IPluginCapabilityProvider): void;
  unregisterProvider(capability: AICapability, providerId: string): void;
}
