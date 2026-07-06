import { beforeEach, describe, expect, it } from "vitest";
import { WaveformRepository } from "./waveform-repository";
import { createInMemoryVfs } from "./test-support/in-memory-vfs";

describe("WaveformRepository", () => {
  let repo: WaveformRepository;

  beforeEach(() => {
    repo = new WaveformRepository(createInMemoryVfs());
  });

  it("round-trips a waveform record for an asset", async () => {
    await repo.create({ id: "asset1", sampleRate: 44100, peaks: [0, 0.5, 1, 0.5] });

    await expect(repo.get("asset1")).resolves.toEqual({
      id: "asset1",
      sampleRate: 44100,
      peaks: [0, 0.5, 1, 0.5],
    });
  });

  it("list() returns waveforms for every asset", async () => {
    await repo.create({ id: "a", sampleRate: 44100, peaks: [] });
    await repo.create({ id: "b", sampleRate: 48000, peaks: [] });

    const items = await repo.list();

    expect(items.map((item) => item.id).sort()).toEqual(["a", "b"]);
  });
});
