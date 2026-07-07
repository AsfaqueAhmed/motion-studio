import { createTrackId } from "@motion-studio/shared";
import { describe, expect, it } from "vitest";
import { Mixer } from "./mixer";
import {
  FakeAudioContext,
  type FakeDynamicsCompressorNode,
  type FakeGainNode,
  type FakeStereoPannerNode,
} from "./test-support/fake-audio-context";

describe("Mixer", () => {
  it("wires the master bus: masterGain -> limiter -> destination", () => {
    const context = new FakeAudioContext();
    const mixer = new Mixer(context);
    const masterGain = mixer.masterGain as FakeGainNode;
    const limiter = mixer.limiter as FakeDynamicsCompressorNode;

    expect(masterGain.connections).toEqual([mixer.limiter]);
    expect(limiter.connections).toEqual([context.destination]);
    expect(mixer.limiter.ratio.value).toBe(20);
  });

  it("wires a new track bus: trackGain -> trackPan -> masterGain", () => {
    const context = new FakeAudioContext();
    const mixer = new Mixer(context);
    const trackId = createTrackId("track-1");

    const input = mixer.addTrack(trackId) as FakeGainNode;

    expect(input).toBe(mixer.getTrackInput(trackId));
    const [pan] = input.connections as [FakeStereoPannerNode];
    expect(pan.connections).toEqual([mixer.masterGain]);
  });

  it("throws when adding a duplicate track", () => {
    const context = new FakeAudioContext();
    const mixer = new Mixer(context);
    const trackId = createTrackId("track-1");
    mixer.addTrack(trackId);

    expect(() => mixer.addTrack(trackId)).toThrow(/already added/);
  });

  it("throws when operating on an unregistered track", () => {
    const mixer = new Mixer(new FakeAudioContext());
    const trackId = createTrackId("missing");

    expect(() => mixer.setTrackVolume(trackId, 1)).toThrow(/no track registered/);
  });

  it("setTrackVolume updates the track gain", () => {
    const mixer = new Mixer(new FakeAudioContext());
    const trackId = createTrackId("track-1");
    const input = mixer.addTrack(trackId);

    mixer.setTrackVolume(trackId, 0.5);

    expect(input.gain.value).toBe(0.5);
  });

  it("rejects negative volume", () => {
    const mixer = new Mixer(new FakeAudioContext());
    const trackId = createTrackId("track-1");
    mixer.addTrack(trackId);

    expect(() => mixer.setTrackVolume(trackId, -1)).toThrow(/volume/);
  });

  it("mute silences the bus without discarding the fader position, unmute restores it", () => {
    const mixer = new Mixer(new FakeAudioContext());
    const trackId = createTrackId("track-1");
    const input = mixer.addTrack(trackId);
    mixer.setTrackVolume(trackId, 0.7);

    mixer.setTrackMuted(trackId, true);
    expect(input.gain.value).toBe(0);

    mixer.setTrackMuted(trackId, false);
    expect(input.gain.value).toBe(0.7);
  });

  it("setTrackVolume while muted stores the value but does not audibly change gain until unmuted", () => {
    const mixer = new Mixer(new FakeAudioContext());
    const trackId = createTrackId("track-1");
    const input = mixer.addTrack(trackId);
    mixer.setTrackMuted(trackId, true);

    mixer.setTrackVolume(trackId, 0.9);
    expect(input.gain.value).toBe(0);

    mixer.setTrackMuted(trackId, false);
    expect(input.gain.value).toBe(0.9);
  });

  it("rejects out-of-range pan", () => {
    const mixer = new Mixer(new FakeAudioContext());
    const trackId = createTrackId("track-1");
    mixer.addTrack(trackId);

    expect(() => mixer.setTrackPan(trackId, 1.5)).toThrow(/pan/);
  });

  it("removeTrack disconnects the bus and forgets the track", () => {
    const mixer = new Mixer(new FakeAudioContext());
    const trackId = createTrackId("track-1");
    const input = mixer.addTrack(trackId) as FakeGainNode;

    mixer.removeTrack(trackId);

    expect(input.connections).toEqual([]);
    expect(() => mixer.getTrackInput(trackId)).toThrow(/no track registered/);
  });

  it("duckTrack schedules a ramp on the track's gain param", () => {
    const mixer = new Mixer(new FakeAudioContext());
    const trackId = createTrackId("track-1");
    const input = mixer.addTrack(trackId) as FakeGainNode;
    mixer.setTrackVolume(trackId, 1);

    mixer.duckTrack(trackId, 0.2, 10, 0.5);

    expect(input.gain.automation).toEqual([
      { op: "cancelScheduledValues", time: 10 },
      { op: "setValueAtTime", value: 1, time: 10 },
      { op: "linearRampToValueAtTime", value: 0.2, time: 10.5 },
    ]);
  });

  it("rejects an invalid duck target volume", () => {
    const mixer = new Mixer(new FakeAudioContext());
    const trackId = createTrackId("track-1");
    mixer.addTrack(trackId);

    expect(() => mixer.duckTrack(trackId, -1, 0, 1)).toThrow(/duck target volume/);
  });
});
