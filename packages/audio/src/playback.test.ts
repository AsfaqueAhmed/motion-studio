import { DEFAULT_TICK_RESOLUTION, PlaybackState, toTick } from "@motion-studio/shared";
import { describe, expect, it } from "vitest";
import { AudioTransport } from "./playback";
import { FakeAudioContext } from "./test-support/fake-audio-context";

const FPS = 30;
const ONE_SECOND_TICKS = FPS * DEFAULT_TICK_RESOLUTION;

describe("AudioTransport", () => {
  it("starts Idle and transitions to Playing on play()", () => {
    const context = new FakeAudioContext();
    const transport = new AudioTransport(context, { fps: FPS });

    expect(transport.playbackState).toBe(PlaybackState.Idle);
    transport.play(toTick(0));
    expect(transport.playbackState).toBe(PlaybackState.Playing);
  });

  it("play() anchors the clock at the current context time", () => {
    const context = new FakeAudioContext();
    context.currentTime = 5;
    const transport = new AudioTransport(context, { fps: FPS });

    transport.play(toTick(0));

    expect(transport.scheduledTimeForTick(toTick(ONE_SECOND_TICKS))).toBeCloseTo(6);
  });

  it("pause() moves to Paused and stop() moves to Idle", () => {
    const context = new FakeAudioContext();
    const transport = new AudioTransport(context, { fps: FPS });
    transport.play(toTick(0));

    transport.pause();
    expect(transport.playbackState).toBe(PlaybackState.Paused);

    transport.stop();
    expect(transport.playbackState).toBe(PlaybackState.Idle);
  });

  it("seek() re-anchors the clock without changing playback state", () => {
    const context = new FakeAudioContext();
    const transport = new AudioTransport(context, { fps: FPS });
    transport.play(toTick(0));
    context.currentTime = 100;

    transport.seek(toTick(ONE_SECOND_TICKS));

    expect(transport.playbackState).toBe(PlaybackState.Playing);
    expect(transport.scheduledTimeForTick(toTick(ONE_SECOND_TICKS * 2))).toBeCloseTo(101);
  });

  it("onAudioSync no-ops while not playing", () => {
    const context = new FakeAudioContext();
    const transport = new AudioTransport(context, { fps: FPS, resyncThresholdSeconds: 0.01 });

    context.currentTime = 999;
    const resynced = transport.onAudioSync(toTick(ONE_SECOND_TICKS));

    expect(resynced).toBe(false);
  });

  it("onAudioSync detects drift while playing and resyncs", () => {
    const context = new FakeAudioContext();
    const transport = new AudioTransport(context, { fps: FPS, resyncThresholdSeconds: 0.01 });
    transport.play(toTick(0));

    context.currentTime = 1.05;
    const resynced = transport.onAudioSync(toTick(ONE_SECOND_TICKS));

    expect(resynced).toBe(true);
  });
});
