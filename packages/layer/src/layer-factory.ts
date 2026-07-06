import {
  LayerType,
  type AssetId,
  type IAudioLayer,
  type IGroupLayer,
  type IImageLayer,
  type IShapeLayer,
  type IStickerLayer,
  type ITextLayer,
  type ITransform2D,
  type IVideoLayer,
  type LayerId,
} from "@motion-studio/shared";

const DEFAULT_TRANSFORM: ITransform2D = {
  x: 0,
  y: 0,
  scaleX: 1,
  scaleY: 1,
  rotation: 0,
  anchorX: 0,
  anchorY: 0,
};

/** Fields every layer type shares. IDs are caller-supplied (Editor Service), never generated here. */
interface IBaseLayerInput {
  id: LayerId;
  name: string;
  parentId?: LayerId | null;
  transform?: Partial<ITransform2D>;
  opacity?: number;
  visible?: boolean;
  locked?: boolean;
}

function baseFields(input: IBaseLayerInput) {
  return {
    id: input.id,
    name: input.name,
    parentId: input.parentId ?? null,
    transform: { ...DEFAULT_TRANSFORM, ...input.transform },
    opacity: input.opacity ?? 1,
    visible: input.visible ?? true,
    locked: input.locked ?? false,
  };
}

export interface ICreateVideoLayerInput extends IBaseLayerInput {
  assetId: AssetId;
  playbackRate?: number;
}

export function createVideoLayer(input: ICreateVideoLayerInput): IVideoLayer {
  return {
    ...baseFields(input),
    type: LayerType.Video,
    assetId: input.assetId,
    playbackRate: input.playbackRate ?? 1,
  };
}

export interface ICreateImageLayerInput extends IBaseLayerInput {
  assetId: AssetId;
  fitMode?: IImageLayer["fitMode"];
}

export function createImageLayer(input: ICreateImageLayerInput): IImageLayer {
  return {
    ...baseFields(input),
    type: LayerType.Image,
    assetId: input.assetId,
    fitMode: input.fitMode ?? "contain",
  };
}

export interface ICreateAudioLayerInput extends IBaseLayerInput {
  assetId: AssetId;
  volume?: number;
}

export function createAudioLayer(input: ICreateAudioLayerInput): IAudioLayer {
  return {
    ...baseFields(input),
    type: LayerType.Audio,
    assetId: input.assetId,
    volume: input.volume ?? 1,
  };
}

export interface ICreateTextLayerInput extends IBaseLayerInput {
  content: string;
  fontFamily?: string;
  fontSize?: number;
  color?: string;
  textAlign?: ITextLayer["textAlign"];
}

export function createTextLayer(input: ICreateTextLayerInput): ITextLayer {
  return {
    ...baseFields(input),
    type: LayerType.Text,
    content: input.content,
    fontFamily: input.fontFamily ?? "Inter",
    fontSize: input.fontSize ?? 48,
    color: input.color ?? "#FFFFFF",
    textAlign: input.textAlign ?? "left",
  };
}

export interface ICreateStickerLayerInput extends IBaseLayerInput {
  assetId: AssetId;
}

export function createStickerLayer(input: ICreateStickerLayerInput): IStickerLayer {
  return {
    ...baseFields(input),
    type: LayerType.Sticker,
    assetId: input.assetId,
  };
}

export interface ICreateShapeLayerInput extends IBaseLayerInput {
  shape?: IShapeLayer["shape"];
  fillColor?: string;
  strokeColor?: string;
  strokeWidth?: number;
  cornerRadius?: number;
}

export function createShapeLayer(input: ICreateShapeLayerInput): IShapeLayer {
  return {
    ...baseFields(input),
    type: LayerType.Shape,
    shape: input.shape ?? "rectangle",
    fillColor: input.fillColor ?? "#FFFFFF",
    strokeColor: input.strokeColor ?? "transparent",
    strokeWidth: input.strokeWidth ?? 0,
    cornerRadius: input.cornerRadius ?? 0,
  };
}

export interface ICreateGroupLayerInput extends IBaseLayerInput {
  /**
   * Pre-existing child ids, e.g. when reconstructing a group from a loaded
   * project. Normal editing flow should leave this empty and add children
   * via `CompositionGraph.addLayer`/`reparent`, which keep each child's
   * `parentId` in sync — setting this directly does not.
   */
  childIds?: LayerId[];
}

export function createGroupLayer(input: ICreateGroupLayerInput): IGroupLayer {
  return {
    ...baseFields(input),
    type: LayerType.Group,
    childIds: input.childIds ?? [],
  };
}
