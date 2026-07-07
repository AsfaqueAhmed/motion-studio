import { afterEach, describe, expect, it } from "vitest";
import type { ISynthesizedAudio } from "./tts-provider";
import { clearVoiceEnhancers, getVoiceEnhancer, registerVoiceEnhancer } from "./voice-enhancer";

const audio: ISynthesizedAudio = {
  sampleRate: 24000,
  numberOfChannels: 1,
  durationSeconds: 1,
  channelData: [new Float32Array([0.1])],
};

afterEach(() => {
  clearVoiceEnhancers();
});

describe("voice-enhancer registration", () => {
  it("registers and retrieves an enhancer by id", async () => {
    registerVoiceEnhancer({
      id: "supertonic",
      async enhance(input) {
        return { ...input, channelData: [input.channelData[0]!.map((v) => v * 2)] };
      },
    });

    const enhancer = getVoiceEnhancer("supertonic");
    expect(enhancer).toBeDefined();
    const result = await enhancer!.enhance(audio);
    expect(result.channelData[0]).toEqual(new Float32Array([0.2]));
  });

  it("returns undefined for an unregistered id", () => {
    expect(getVoiceEnhancer("missing")).toBeUndefined();
  });

  it("clearVoiceEnhancers removes every registration", () => {
    registerVoiceEnhancer({ id: "supertonic", enhance: async (a) => a });
    clearVoiceEnhancers();
    expect(getVoiceEnhancer("supertonic")).toBeUndefined();
  });
});
