import { AICapability } from "@motion-studio/shared";
import { describe, expect, it } from "vitest";
import {
  CapabilityProviderNotFoundError,
  CapabilityRegistry,
  NoCapabilityProviderError,
} from "./capability-registry";
import { InferenceBackend } from "./inference-backend";

function provider(id: string, capability = AICapability.TextToSpeech) {
  return { id, capability, modelId: `${id}-model` };
}

describe("CapabilityRegistry", () => {
  it("resolves the first-registered provider by default", () => {
    const registry = new CapabilityRegistry();
    registry.registerProvider(provider("kokoro"));
    registry.registerProvider(provider("piper"));

    expect(registry.resolveProvider(AICapability.TextToSpeech).id).toBe("kokoro");
  });

  it("resolves a specific provider by id", () => {
    const registry = new CapabilityRegistry();
    registry.registerProvider(provider("kokoro"));
    registry.registerProvider(provider("piper"));

    expect(registry.resolveProvider(AICapability.TextToSpeech, "piper").id).toBe("piper");
  });

  it("re-registering the same id replaces rather than duplicates", () => {
    const registry = new CapabilityRegistry();
    registry.registerProvider(provider("kokoro"));
    registry.registerProvider(provider("kokoro"));

    expect(registry.getProviders(AICapability.TextToSpeech)).toHaveLength(1);
  });

  it("unregisterProvider removes only the matching provider", () => {
    const registry = new CapabilityRegistry();
    registry.registerProvider(provider("kokoro"));
    registry.registerProvider(provider("piper"));

    registry.unregisterProvider(AICapability.TextToSpeech, "kokoro");

    expect(registry.getProviders(AICapability.TextToSpeech).map((p) => p.id)).toEqual(["piper"]);
  });

  it("throws NoCapabilityProviderError when nothing is registered", () => {
    const registry = new CapabilityRegistry();
    expect(() => registry.resolveProvider(AICapability.TextToSpeech)).toThrow(
      NoCapabilityProviderError,
    );
  });

  it("throws CapabilityProviderNotFoundError for an unknown provider id", () => {
    const registry = new CapabilityRegistry();
    registry.registerProvider(provider("kokoro"));
    expect(() => registry.resolveProvider(AICapability.TextToSpeech, "missing")).toThrow(
      CapabilityProviderNotFoundError,
    );
  });

  it("stores and retrieves a capability descriptor", () => {
    const registry = new CapabilityRegistry();
    registry.registerDescriptor({
      capability: AICapability.TextToSpeech,
      requiredInputs: ["text", "voice"],
      outputs: ["audio"],
      preferredBackend: InferenceBackend.WebGpu,
      estimatedResourceCost: "high",
    });

    expect(registry.getDescriptor(AICapability.TextToSpeech)?.estimatedResourceCost).toBe("high");
  });
});
