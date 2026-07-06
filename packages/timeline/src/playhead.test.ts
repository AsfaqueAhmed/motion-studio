import { PlaybackState, toTick } from "@motion-studio/shared";
import { describe, expect, it } from "vitest";
import { Playhead } from "./playhead";

describe("Playhead", () => {
  it("starts Idle at tick 0", () => {
    const playhead = new Playhead(toTick(900));
    expect(playhead.playbackState).toBe(PlaybackState.Idle);
    expect(playhead.currentTick).toBe(toTick(0));
  });

  it("seek clamps to [0, durationTicks)", () => {
    const playhead = new Playhead(toTick(900));
    playhead.seek(toTick(-50));
    expect(playhead.currentTick).toBe(toTick(0));
    playhead.seek(toTick(5000));
    expect(playhead.currentTick).toBe(toTick(899));
  });

  it("play/pause/stop transition playbackState", () => {
    const playhead = new Playhead(toTick(900));
    playhead.play();
    expect(playhead.playbackState).toBe(PlaybackState.Playing);
    playhead.pause();
    expect(playhead.playbackState).toBe(PlaybackState.Paused);
    playhead.play();
    playhead.seek(toTick(500));
    playhead.stop();
    expect(playhead.playbackState).toBe(PlaybackState.Idle);
    expect(playhead.currentTick).toBe(toTick(0));
  });

  it("advance only moves the tick while Playing", () => {
    const playhead = new Playhead(toTick(900));
    playhead.advance(toTick(100));
    expect(playhead.currentTick).toBe(toTick(0));

    playhead.play();
    playhead.advance(toTick(100));
    expect(playhead.currentTick).toBe(toTick(100));
  });

  it("advance stops at the composition end when no loop is set", () => {
    const playhead = new Playhead(toTick(900));
    playhead.play();
    playhead.advance(toTick(1000));
    expect(playhead.currentTick).toBe(toTick(899));
    expect(playhead.playbackState).toBe(PlaybackState.Idle);
  });

  it("advance wraps to loop.inTick on overshooting loop.outTick", () => {
    const playhead = new Playhead(toTick(900));
    playhead.setLoop({ inTick: toTick(100), outTick: toTick(200) });
    playhead.play();
    playhead.seek(toTick(150));

    playhead.advance(toTick(60));

    expect(playhead.currentTick).toBe(toTick(109));
    expect(playhead.playbackState).toBe(PlaybackState.Playing);
  });

  it("setLoop rejects an inTick at or after outTick", () => {
    const playhead = new Playhead(toTick(900));
    expect(() => playhead.setLoop({ inTick: toTick(200), outTick: toTick(100) })).toThrow(
      /inTick must be before outTick/,
    );
  });

  it("frameStep moves by exactly one tickResolution's worth of ticks", () => {
    const playhead = new Playhead(toTick(900), 30);
    playhead.seek(toTick(60));
    playhead.frameStep(1);
    expect(playhead.currentTick).toBe(toTick(90));
    playhead.frameStep(-1);
    expect(playhead.currentTick).toBe(toTick(60));
  });
});
