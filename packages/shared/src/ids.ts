type Brand<T, B extends string> = T & { readonly __brand: B };

export type LayerId = Brand<string, "LayerId">;
export type CompositionId = Brand<string, "CompositionId">;
export type TrackId = Brand<string, "TrackId">;
export type TrackItemId = Brand<string, "TrackItemId">;
export type AssetId = Brand<string, "AssetId">;
export type ProjectId = Brand<string, "ProjectId">;
export type AnimationClipId = Brand<string, "AnimationClipId">;
export type PropertyTrackId = Brand<string, "PropertyTrackId">;
export type EffectNodeId = Brand<string, "EffectNodeId">;

export function createLayerId(value: string): LayerId {
  return value as LayerId;
}

export function createCompositionId(value: string): CompositionId {
  return value as CompositionId;
}

export function createTrackId(value: string): TrackId {
  return value as TrackId;
}

export function createTrackItemId(value: string): TrackItemId {
  return value as TrackItemId;
}

export function createAssetId(value: string): AssetId {
  return value as AssetId;
}

export function createProjectId(value: string): ProjectId {
  return value as ProjectId;
}

export function createAnimationClipId(value: string): AnimationClipId {
  return value as AnimationClipId;
}

export function createPropertyTrackId(value: string): PropertyTrackId {
  return value as PropertyTrackId;
}

export function createEffectNodeId(value: string): EffectNodeId {
  return value as EffectNodeId;
}
