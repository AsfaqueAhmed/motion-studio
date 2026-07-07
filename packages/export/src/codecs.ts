/**
 * Codec/container identifiers the Export Engine actually chooses between.
 * Kept local to this package (unlike `ExportPreset`, which lives in
 * `@motion-studio/shared` because it's referenced by the event catalog) —
 * nothing outside Export needs to know a preset's codec makeup, only its id.
 * String values match Mediabunny/WebCodecs' own codec strings
 * (`docs/13-export/muxer.md`'s `canEncodeVideo`/`canEncodeAudio` calls).
 */
export enum VideoCodec {
  H264 = "avc",
  VP9 = "vp9",
}

export enum AudioCodec {
  Opus = "opus",
  AAC = "aac",
}

export enum ContainerFormat {
  MP4 = "mp4",
  WebM = "webm",
}

/**
 * Structurally matches Mediabunny's `canEncodeVideo`/`canEncodeAudio`
 * (`docs/13-export/muxer.md`) — hand-rolled and injected rather than
 * imported so tests can fake capability results without a real browser,
 * matching the DI pattern `packages/audio/src/audio-context.ts` uses for
 * Web Audio.
 */
export interface IEncodeCapabilityProbe {
  canEncodeVideo(codec: VideoCodec): Promise<boolean>;
  canEncodeAudio(codec: AudioCodec): Promise<boolean>;
}

export class UnsupportedCodecError extends Error {
  constructor(kind: "video" | "audio", tried: readonly string[]) {
    super(`No supported ${kind} codec found (tried: ${tried.join(", ")})`);
    this.name = "UnsupportedCodecError";
  }
}

/**
 * `docs/13-export/webcodecs.md`: AAC is confirmed unsupported in Firefox
 * (all platforms) and on desktop Linux generally. Opus is the documented
 * default (CLAUDE.md "Known hard risks" #2); AAC stays an opt-in preset
 * gated by this same capability check, never assumed.
 */
export async function resolveAudioCodec(
  probe: IEncodeCapabilityProbe,
  preferred: AudioCodec,
): Promise<AudioCodec> {
  if (await probe.canEncodeAudio(preferred)) {
    return preferred;
  }
  if (preferred !== AudioCodec.Opus && (await probe.canEncodeAudio(AudioCodec.Opus))) {
    return AudioCodec.Opus;
  }
  throw new UnsupportedCodecError("audio", [preferred, AudioCodec.Opus]);
}

/** H.264 primary, VP9 secondary, per PLAN.md Phase 10's "VideoEncoder wrapper" line. */
export async function resolveVideoCodec(
  probe: IEncodeCapabilityProbe,
  preferred: VideoCodec,
): Promise<VideoCodec> {
  if (await probe.canEncodeVideo(preferred)) {
    return preferred;
  }
  const fallback = preferred === VideoCodec.H264 ? VideoCodec.VP9 : VideoCodec.H264;
  if (await probe.canEncodeVideo(fallback)) {
    return fallback;
  }
  throw new UnsupportedCodecError("video", [preferred, fallback]);
}
