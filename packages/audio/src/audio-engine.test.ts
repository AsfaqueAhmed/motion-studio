import { createTrackId, toTick } from "@motion-studio/shared";
import { describe, expect, it } from "vitest";
import { AudioEngine } from "./audio-engine";
import { FakeAudioContext, FakeOfflineAudioContext } from "./test-support/fake-audio-context";

describe("AudioEngine", () => {
  it("follows the standard IEngine lifecycle without throwing", async () => {
    const engine = new AudioEngine({ fps: 30 });
    expect(engine.name).toBe("Audio");
    await engine.initialize();
    await engine.ready();
    await engine.dispose();
  });

  it("throws when accessing the mixer/transport before a context is attached", () => {
    const engine = new AudioEngine({ fps: 30 });
    expect(() => engine.mixer).toThrow(/no realtime AudioContext attached/);
    expect(() => engine.transport).toThrow(/no realtime AudioContext attached/);
  });

  it("attachRealtimeContext wires a Mixer and Transport against the given context", () => {
    const engine = new AudioEngine({ fps: 30 });
    const context = new FakeAudioContext();

    engine.attachRealtimeContext(context);

    expect(engine.mixer).toBeDefined();
    expect(engine.transport).toBeDefined();
  });

  it("addTrack delegates to the attached Mixer", () => {
    const engine = new AudioEngine({ fps: 30 });
    engine.attachRealtimeContext(new FakeAudioContext());
    const trackId = createTrackId("track-1");

    engine.addTrack(trackId);

    expect(engine.mixer.getTrackInput(trackId)).toBeDefined();
  });

  it("onAudioSync delegates to the attached Transport", () => {
    const engine = new AudioEngine({ fps: 30 });
    const context = new FakeAudioContext();
    engine.attachRealtimeContext(context);

    expect(engine.onAudioSync(toTick(0))).toBe(false);
  });

  it("dispose detaches the realtime session", async () => {
    const engine = new AudioEngine({ fps: 30 });
    engine.attachRealtimeContext(new FakeAudioContext());

    await engine.dispose();

    expect(() => engine.mixer).toThrow(/no realtime AudioContext attached/);
  });

  it("buildOfflineMixer creates an independent Mixer against an OfflineAudioContext", () => {
    const engine = new AudioEngine({ fps: 30 });
    const offlineContext = new FakeOfflineAudioContext({ lengthSeconds: 10 });

    const offlineMixer = engine.buildOfflineMixer(offlineContext);

    expect(offlineMixer.masterGain).toBeDefined();
    expect(() => engine.mixer).toThrow(/no realtime AudioContext attached/);
  });
});
