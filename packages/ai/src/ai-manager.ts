import { AICapability, type IAIEngine } from "@motion-studio/shared";
import { CapabilityRegistry, type ICapabilityDescriptor } from "./capability-registry";
import type { IAIEventSink, ModelManager } from "./model-manager";
import type { ISynthesizedAudio, ITTSProvider } from "./tts-provider";
import { getVoiceEnhancer } from "./voice-enhancer";

export interface IAIManagerOptions {
  readonly modelManager: ModelManager;
  readonly capabilities?: CapabilityRegistry;
  readonly events?: IAIEventSink;
}

/**
 * Thin `IEngine` facade tying the Capability Registry, Model Manager, and
 * capability providers together — matching `AssetManager`/`ExportEngine`'s
 * split (engine class owns lifecycle + orchestration bookkeeping, standalone
 * classes/functions own the actual logic). See docs/11-ai/ai-manager.md.
 *
 * `docs/11-ai/ai-manager.md`'s "Task queue, priority scheduling, worker
 * dispatch" is **not implemented** — every call here runs synchronously on
 * the caller's thread, the same "engine exists, integration is later" gap
 * as Export's job runner and Assets' import pipeline.
 */
export class AIManager implements IAIEngine {
  readonly name = "AI";
  readonly capabilities: CapabilityRegistry;

  constructor(private readonly options: IAIManagerOptions) {
    this.capabilities = options.capabilities ?? new CapabilityRegistry();
  }

  initialize(): void {}

  ready(): void {}

  async dispose(): Promise<void> {
    await this.options.modelManager.unloadAll();
  }

  registerCapability(descriptor: ICapabilityDescriptor): void {
    this.capabilities.registerDescriptor(descriptor);
  }

  registerTTSProvider(provider: ITTSProvider): void {
    this.capabilities.registerProvider(provider);
  }

  /**
   * `taskId` is caller-supplied (matching Export's caller-supplied `jobId`)
   * so a future task queue can correlate `InferenceCompleted`/
   * `InferenceFailed` events without this class needing to generate or
   * track ids itself.
   */
  async synthesizeSpeech(
    taskId: string,
    text: string,
    voiceId: string,
    providerId?: string,
  ): Promise<ISynthesizedAudio> {
    try {
      const provider = this.capabilities.resolveProvider(
        AICapability.TextToSpeech,
        providerId,
      ) as ITTSProvider;
      const audio = await provider.synthesize(text, voiceId);
      this.options.events?.emit("InferenceCompleted", {
        taskId,
        capability: AICapability.TextToSpeech,
      });
      return audio;
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      this.options.events?.emit("InferenceFailed", {
        taskId,
        capability: AICapability.TextToSpeech,
        reason,
      });
      throw error;
    }
  }

  /** Applies a registered `IVoiceEnhancer` (`voice-enhancer.ts`) to already-synthesized audio — a separate step from `synthesizeSpeech`, never implicit. */
  async enhanceVoice(audio: ISynthesizedAudio, enhancerId: string): Promise<ISynthesizedAudio> {
    const enhancer = getVoiceEnhancer(enhancerId);
    if (!enhancer) {
      throw new Error(`AIManager: no voice enhancer registered with id "${enhancerId}"`);
    }
    return enhancer.enhance(audio);
  }
}
