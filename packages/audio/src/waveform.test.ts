import { describe, expect, it } from "vitest";
import { peaksInRange, type IWaveformData } from "./waveform";

function waveform(overrides: Partial<IWaveformData> = {}): IWaveformData {
  return {
    sampleRate: 48000,
    channels: 2,
    peaks: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
    durationSeconds: 10,
    ...overrides,
  };
}

describe("peaksInRange", () => {
  it("slices the peaks overlapping the given range", () => {
    expect(peaksInRange(waveform(), 2, 5)).toEqual([2, 3, 4]);
  });

  it("clamps to the start/end of the peaks array", () => {
    expect(peaksInRange(waveform(), -5, 100)).toEqual(waveform().peaks);
  });

  it("returns an empty array for an empty waveform", () => {
    expect(peaksInRange(waveform({ peaks: [], durationSeconds: 0 }), 0, 1)).toEqual([]);
  });

  it("rejects an inverted range", () => {
    expect(() => peaksInRange(waveform(), 5, 2)).toThrow(/endSeconds/);
  });
});
