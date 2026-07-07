/** Peaks are already downsampled for display — matches storage's `IWaveformRecord` shape minus `id`. */
export interface IWaveformPeaks {
  readonly sampleRate: number;
  readonly peaks: readonly number[];
}

/** Pure compute step (`docs/14-assets/importer.md`); only meaningful for `AssetType.Audio`/`AssetType.Video` with an audio track. */
export interface IWaveformGenerator {
  generate(data: Uint8Array): Promise<IWaveformPeaks>;
}
