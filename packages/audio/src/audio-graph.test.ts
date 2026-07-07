import { describe, expect, it } from "vitest";
import { buildClipChain } from "./audio-graph";
import {
  FakeAudioContext,
  type FakeAudioBufferSourceNode,
  type FakeGainNode,
  type FakeStereoPannerNode,
} from "./test-support/fake-audio-context";
import type { IAudioBuffer } from "./audio-context";

function fakeBuffer(): IAudioBuffer {
  return { duration: 4, numberOfChannels: 2, sampleRate: 48000 };
}

function asFakes(chain: ReturnType<typeof buildClipChain>) {
  return {
    source: chain.source as FakeAudioBufferSourceNode,
    gain: chain.gain as FakeGainNode,
    pan: chain.pan as FakeStereoPannerNode,
  };
}

describe("buildClipChain", () => {
  it("wires Clip -> Gain -> Pan in order", () => {
    const context = new FakeAudioContext();
    const chain = buildClipChain(context, { buffer: fakeBuffer(), volume: 0.8 });
    const { source, gain, pan } = asFakes(chain);

    expect(source.connections).toEqual([gain]);
    expect(gain.connections).toEqual([pan]);
    expect(chain.gain.gain.value).toBe(0.8);
    expect(chain.pan.pan.value).toBe(0);
  });

  it("applies pan, loop, and playbackRate options", () => {
    const context = new FakeAudioContext();
    const chain = buildClipChain(context, {
      buffer: fakeBuffer(),
      volume: 1,
      pan: -0.5,
      loop: true,
      playbackRate: 1.5,
    });

    expect(chain.pan.pan.value).toBe(-0.5);
    expect(chain.source.loop).toBe(true);
    expect(chain.source.playbackRate.value).toBe(1.5);
  });

  it("connect() wires the chain's output (Pan) to the destination", () => {
    const context = new FakeAudioContext();
    const chain = buildClipChain(context, { buffer: fakeBuffer(), volume: 1 });
    const destination = context.createGain();
    const { pan } = asFakes(chain);

    chain.connect(destination);

    expect(pan.connections).toEqual([destination]);
  });

  it("delegates start/stop to the source node", () => {
    const context = new FakeAudioContext();
    const chain = buildClipChain(context, { buffer: fakeBuffer(), volume: 1 });
    const { source } = asFakes(chain);

    chain.start(1.5, 0.25, 2);
    chain.stop(3.5);

    expect(source.startCalls).toEqual([{ when: 1.5, offset: 0.25, duration: 2 }]);
    expect(source.stopCalls).toEqual([3.5]);
  });

  it("rejects negative volume", () => {
    const context = new FakeAudioContext();
    expect(() => buildClipChain(context, { buffer: fakeBuffer(), volume: -1 })).toThrow(/volume/);
  });

  it("rejects out-of-range pan", () => {
    const context = new FakeAudioContext();
    expect(() => buildClipChain(context, { buffer: fakeBuffer(), volume: 1, pan: 2 })).toThrow(
      /pan/,
    );
  });
});
