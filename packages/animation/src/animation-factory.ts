import {
  InterpolationType,
  type AnimationClipId,
  type ICubicBezierControlPoints,
  type IAnimationClip,
  type IKeyframe,
  type IPropertyTrack,
  type LayerId,
  type LayerType,
  type PropertyTrackId,
  type PropertyValueType,
  type Tick,
} from "@motion-studio/shared";

/** IDs are caller-supplied (Editor Service), never generated here — matches `@motion-studio/layer` and `@motion-studio/timeline`'s factory convention. */
export interface ICreateAnimationClipInput {
  id: AnimationClipId;
  layerId: LayerId;
  layerType: LayerType;
  name: string;
  propertyTrackIds?: PropertyTrackId[];
}

export function createAnimationClip(input: ICreateAnimationClipInput): IAnimationClip {
  return {
    id: input.id,
    layerId: input.layerId,
    layerType: input.layerType,
    name: input.name,
    propertyTrackIds: input.propertyTrackIds ?? [],
  };
}

export interface ICreatePropertyTrackInput {
  id: PropertyTrackId;
  clipId: AnimationClipId;
  propertyKey: string;
  valueType: PropertyValueType;
  keyframes?: IKeyframe[];
}

export function createPropertyTrack(input: ICreatePropertyTrackInput): IPropertyTrack {
  return {
    id: input.id,
    clipId: input.clipId,
    propertyKey: input.propertyKey,
    valueType: input.valueType,
    keyframes: input.keyframes ? [...input.keyframes].sort((a, b) => a.tick - b.tick) : [],
  };
}

export interface ICreateKeyframeInput<TValue = unknown> {
  tick: Tick;
  value: TValue;
  interpolation?: InterpolationType;
  bezierControlPoints?: ICubicBezierControlPoints;
}

export function createKeyframe<TValue = unknown>(
  input: ICreateKeyframeInput<TValue>,
): IKeyframe<TValue> {
  return {
    tick: input.tick,
    value: input.value,
    interpolation: input.interpolation ?? InterpolationType.Linear,
    ...(input.bezierControlPoints ? { bezierControlPoints: input.bezierControlPoints } : {}),
  };
}
