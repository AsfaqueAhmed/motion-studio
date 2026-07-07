import type { TrackId } from "@motion-studio/shared";
import type {
  IAudioContext,
  IDynamicsCompressorNode,
  IGainNode,
  IStereoPannerNode,
} from "./audio-context";

interface ITrackBusState {
  readonly gain: IGainNode;
  readonly pan: IStereoPannerNode;
  volume: number;
  muted: boolean;
}

/**
 * `Clip -> Gain -> Pan -> Effects -> Track Bus -> Master Bus (Limiter) ->
 * Output`, per `docs/10-audio-engine/mixer.md` and `overview.md`. One
 * `Mixer` owns exactly one master bus; each Timeline `TrackId` (Audio
 * track type) gets its own bus of `(volume/mute gain) -> pan`, feeding the
 * shared master gain and its limiter.
 *
 * `muted` is layered on top of `volume` rather than overwriting it, so
 * `setTrackMuted(id, false)` restores the fader position instead of
 * resetting it to unity.
 */
export class Mixer {
  private readonly context: IAudioContext;
  readonly masterGain: IGainNode;
  readonly limiter: IDynamicsCompressorNode;
  private readonly tracks = new Map<TrackId, ITrackBusState>();

  constructor(context: IAudioContext, options: { limiterThresholdDb?: number } = {}) {
    this.context = context;
    this.masterGain = context.createGain();
    this.limiter = context.createDynamicsCompressor();
    this.limiter.threshold.value = options.limiterThresholdDb ?? -1;
    this.limiter.knee.value = 0;
    this.limiter.ratio.value = 20;
    this.limiter.attack.value = 0.003;
    this.limiter.release.value = 0.05;
    this.masterGain.connect(this.limiter);
    this.limiter.connect(context.destination);
  }

  /** Creates the track's bus and returns the node clips/effect chains should `.connect()` into. */
  addTrack(trackId: TrackId): IGainNode {
    if (this.tracks.has(trackId)) {
      throw new Error(`Mixer: track "${trackId}" already added`);
    }
    const gain = this.context.createGain();
    const pan = this.context.createStereoPanner();
    gain.connect(pan);
    pan.connect(this.masterGain);
    this.tracks.set(trackId, { gain, pan, volume: 1, muted: false });
    return gain;
  }

  removeTrack(trackId: TrackId): void {
    const track = this.require(trackId);
    track.gain.disconnect();
    track.pan.disconnect();
    this.tracks.delete(trackId);
  }

  getTrackInput(trackId: TrackId): IGainNode {
    return this.require(trackId).gain;
  }

  setTrackVolume(trackId: TrackId, volume: number): void {
    if (volume < 0) {
      throw new Error("Mixer: volume must be >= 0");
    }
    const track = this.require(trackId);
    track.volume = volume;
    if (!track.muted) {
      track.gain.gain.value = volume;
    }
  }

  setTrackMuted(trackId: TrackId, muted: boolean): void {
    const track = this.require(trackId);
    track.muted = muted;
    track.gain.gain.value = muted ? 0 : track.volume;
  }

  setTrackPan(trackId: TrackId, pan: number): void {
    if (pan < -1 || pan > 1) {
      throw new Error("Mixer: pan must be in [-1, 1]");
    }
    this.require(trackId).pan.pan.value = pan;
  }

  /**
   * Ducking hook — carried-forward design-review recommendation
   * (`overview.md` "Recommendation carried from design review"): auto-
   * lowering music under narration is common enough in this app's
   * category to design into the bus/routing model now rather than
   * retrofit later. It's just a scheduled linear ramp on the track's
   * existing gain node, not a separate subsystem — call it again with the
   * track's pre-duck volume to restore the fader.
   */
  duckTrack(trackId: TrackId, targetVolume: number, atTime: number, rampSeconds: number): void {
    if (targetVolume < 0) {
      throw new Error("Mixer: duck target volume must be >= 0");
    }
    if (rampSeconds < 0) {
      throw new Error("Mixer: duck rampSeconds must be >= 0");
    }
    const track = this.require(trackId);
    track.gain.gain.cancelScheduledValues(atTime);
    track.gain.gain.setValueAtTime(track.gain.gain.value, atTime);
    track.gain.gain.linearRampToValueAtTime(targetVolume, atTime + rampSeconds);
  }

  private require(trackId: TrackId): ITrackBusState {
    const track = this.tracks.get(trackId);
    if (!track) {
      throw new Error(`Mixer: no track registered for "${trackId}"`);
    }
    return track;
  }
}
