import { JsonRepository } from "./json-repository";
import type { IVFS } from "./vfs";

const WAVEFORMS_DIR = "waveforms";

/** One waveform per asset. `id` is the asset's id as a plain string. */
export interface IWaveformRecord {
  id: string;
  sampleRate: number;
  /** Peak amplitude per bucket, already downsampled for display. */
  peaks: number[];
}

/** Waveform cache, keyed by assetId. See docs/12-storage/overview.md "Repositories". */
export class WaveformRepository extends JsonRepository<IWaveformRecord> {
  constructor(vfs: IVFS) {
    super(vfs, WAVEFORMS_DIR);
  }
}
