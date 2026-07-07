/**
 * Waveform generation is delegated to the Assets/Media decode pipeline
 * (`14-assets/metadata.md`), not the Audio Engine — per
 * `docs/10-audio-engine/waveform.md`, this package only ever consumes an
 * already-computed peak array for display, so it never re-decodes audio
 * just to draw a waveform in the Timeline UI (Phase 17).
 */
export interface IWaveformData {
  readonly sampleRate: number;
  readonly channels: number;
  /** One peak value (0..1) per fixed-size time bucket spanning `durationSeconds`. */
  readonly peaks: readonly number[];
  readonly durationSeconds: number;
}

/** Slices the cached peaks overlapping `[startSeconds, endSeconds)`, for rendering one visible clip range. */
export function peaksInRange(
  waveform: IWaveformData,
  startSeconds: number,
  endSeconds: number,
): readonly number[] {
  if (endSeconds < startSeconds) {
    throw new Error("peaksInRange: endSeconds must be >= startSeconds");
  }
  if (waveform.peaks.length === 0 || waveform.durationSeconds <= 0) {
    return [];
  }
  const bucketSeconds = waveform.durationSeconds / waveform.peaks.length;
  const startIndex = Math.max(0, Math.floor(startSeconds / bucketSeconds));
  const endIndex = Math.min(waveform.peaks.length, Math.ceil(endSeconds / bucketSeconds));
  return waveform.peaks.slice(startIndex, endIndex);
}
