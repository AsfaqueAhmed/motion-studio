import { describe, expect, it } from "vitest";
import {
  createAudioWorkletEffectNode,
  createCompressorNode,
  createDelayNode,
  createEqChain,
  createLimiterNode,
  createReverbChain,
} from "./effects";
import {
  FakeAudioContext,
  FakeAudioWorkletContext,
  type FakeBiquadFilterNode,
  type FakeConvolverNode,
  type FakeGainNode,
} from "./test-support/fake-audio-context";
import type { IAudioBuffer } from "./audio-context";

function impulseResponse(): IAudioBuffer {
  return { duration: 1, numberOfChannels: 2, sampleRate: 48000 };
}

describe("createEqChain", () => {
  it("chains bands in order and exposes input/output endpoints", () => {
    const context = new FakeAudioContext();
    const chain = createEqChain(context, [
      { type: "lowshelf", frequency: 100, gainDb: 3 },
      { type: "peaking", frequency: 1000, gainDb: -2, q: 0.7 },
      { type: "highshelf", frequency: 8000, gainDb: 1 },
    ]);

    expect(chain.filters).toHaveLength(3);
    expect(chain.input).toBe(chain.filters[0]);
    expect(chain.output).toBe(chain.filters[2]);
    const [first, second, third] = chain.filters as [
      FakeBiquadFilterNode,
      FakeBiquadFilterNode,
      FakeBiquadFilterNode,
    ];
    expect(first.connections).toEqual([second]);
    expect(second.connections).toEqual([third]);
    expect(third.connections).toEqual([]);
    expect(second.Q.value).toBe(0.7);
  });

  it("a single-band chain has input === output", () => {
    const context = new FakeAudioContext();
    const chain = createEqChain(context, [{ type: "peaking", frequency: 500, gainDb: 1 }]);
    expect(chain.input).toBe(chain.output);
  });

  it("rejects an empty band list", () => {
    const context = new FakeAudioContext();
    expect(() => createEqChain(context, [])).toThrow(/at least one band/);
  });
});

describe("createCompressorNode", () => {
  it("applies defaults", () => {
    const node = createCompressorNode(new FakeAudioContext());
    expect(node.threshold.value).toBe(-24);
    expect(node.ratio.value).toBe(12);
  });

  it("applies overrides", () => {
    const node = createCompressorNode(new FakeAudioContext(), { thresholdDb: -10, ratio: 4 });
    expect(node.threshold.value).toBe(-10);
    expect(node.ratio.value).toBe(4);
  });
});

describe("createLimiterNode", () => {
  it("configures a hard-ratio, fast-attack compressor", () => {
    const node = createLimiterNode(new FakeAudioContext(), -2);
    expect(node.threshold.value).toBe(-2);
    expect(node.ratio.value).toBe(20);
    expect(node.knee.value).toBe(0);
  });
});

describe("createDelayNode", () => {
  it("sets delayTime within bounds", () => {
    const node = createDelayNode(new FakeAudioContext(), 0.3, 1);
    expect(node.delayTime.value).toBe(0.3);
  });

  it("rejects a delay beyond maxDelaySeconds", () => {
    expect(() => createDelayNode(new FakeAudioContext(), 2, 1)).toThrow(/delaySeconds/);
  });

  it("rejects a negative delay", () => {
    expect(() => createDelayNode(new FakeAudioContext(), -1)).toThrow(/delaySeconds/);
  });
});

describe("createReverbChain", () => {
  it("wires dry and wet paths from input to output", () => {
    const context = new FakeAudioContext();
    const chain = createReverbChain(context, impulseResponse(), 0.4);
    const input = chain.input as FakeGainNode;
    const output = chain.output as FakeGainNode;

    expect(input.connections).toHaveLength(2);
    const [dryGain, convolver] = input.connections as [FakeGainNode, FakeConvolverNode];
    expect(dryGain.gain.value).toBeCloseTo(0.6);
    expect(dryGain.connections).toEqual([output]);
    expect(convolver.buffer).toEqual(impulseResponse());
    const [wetGain] = convolver.connections as [FakeGainNode];
    expect(wetGain.gain.value).toBeCloseTo(0.4);
    expect(wetGain.connections).toEqual([output]);
  });

  it("rejects an out-of-range wetMix", () => {
    const context = new FakeAudioContext();
    expect(() => createReverbChain(context, impulseResponse(), 1.5)).toThrow(/wetMix/);
  });
});

describe("createAudioWorkletEffectNode", () => {
  it("registers the module then instantiates the processor", async () => {
    const context = new FakeAudioWorkletContext();

    const node = await createAudioWorkletEffectNode(context, {
      moduleUrl: "/worklets/noise-gate.js",
      processorName: "noise-gate-processor",
      parameterData: { thresholdDb: -40 },
    });

    expect(context.addModuleCalls).toEqual(["/worklets/noise-gate.js"]);
    expect(context.createdWorkletNodes).toHaveLength(1);
    expect(context.createdWorkletNodes[0]).toBe(node);
    expect(context.createdWorkletNodes[0]?.options).toEqual({
      processorOptions: { thresholdDb: -40 },
    });
  });
});
