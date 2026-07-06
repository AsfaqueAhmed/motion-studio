import {
  toTick,
  type CompositionId,
  type IComposition,
  type ITrack,
  type ITrackItem,
  type LayerId,
  type Tick,
  type TrackId,
  type TrackItemId,
  type TrackType,
} from "@motion-studio/shared";

/** IDs are caller-supplied (Editor Service), never generated here — matches `@motion-studio/layer`'s factory convention. */
export interface ICreateCompositionInput {
  id: CompositionId;
  name: string;
  width: number;
  height: number;
  fps: number;
  durationTicks: Tick;
  tracks?: TrackId[];
}

export function createComposition(input: ICreateCompositionInput): IComposition {
  return {
    id: input.id,
    name: input.name,
    width: input.width,
    height: input.height,
    fps: input.fps,
    durationTicks: input.durationTicks,
    tracks: input.tracks ?? [],
  };
}

export interface ICreateTrackInput {
  id: TrackId;
  type: TrackType;
  label: string;
  locked?: boolean;
  muted?: boolean;
  items?: TrackItemId[];
}

export function createTrack(input: ICreateTrackInput): ITrack {
  return {
    id: input.id,
    type: input.type,
    label: input.label,
    locked: input.locked ?? false,
    muted: input.muted ?? false,
    items: input.items ?? [],
  };
}

export interface ICreateTrackItemInput {
  id: TrackItemId;
  trackId: TrackId;
  layerId: LayerId;
  startTick: Tick;
  durationTicks: Tick;
  /** Offsets into the referenced Layer's own source media. Defaults to `[0, durationTicks)`. */
  trimInTick?: Tick;
  trimOutTick?: Tick;
}

export function createTrackItem(input: ICreateTrackItemInput): ITrackItem {
  const trimInTick = input.trimInTick ?? toTick(0);
  const trimOutTick = input.trimOutTick ?? toTick(trimInTick + input.durationTicks);
  return {
    id: input.id,
    trackId: input.trackId,
    layerId: input.layerId,
    startTick: input.startTick,
    durationTicks: input.durationTicks,
    trimInTick,
    trimOutTick,
  };
}
