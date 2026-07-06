import type { LayerType } from "./enums";
import type { AssetId, LayerId } from "./ids";

export interface ITransform2D {
  x: number;
  y: number;
  scaleX: number;
  scaleY: number;
  rotation: number;
  anchorX: number;
  anchorY: number;
}

/**
 * Common fields for every Layer. See GLOSSARY.md "Layer" — the canonical
 * unit of "what", independent of Timeline (when) and Rendering (where in
 * the frame). Referenced by TrackItems by id, never embedded/duplicated.
 */
export interface ILayerBase {
  id: LayerId;
  type: LayerType;
  name: string;
  transform: ITransform2D;
  opacity: number;
  visible: boolean;
  locked: boolean;
  /** Composition Graph parent, or null at the root. See ADR-006. */
  parentId: LayerId | null;
}

export interface IVideoLayer extends ILayerBase {
  type: LayerType.Video;
  assetId: AssetId;
  playbackRate: number;
}

export interface IImageLayer extends ILayerBase {
  type: LayerType.Image;
  assetId: AssetId;
  fitMode: "contain" | "cover" | "fill" | "none";
}

export interface IAudioLayer extends ILayerBase {
  type: LayerType.Audio;
  assetId: AssetId;
  volume: number;
}

export interface ITextLayer extends ILayerBase {
  type: LayerType.Text;
  content: string;
  fontFamily: string;
  fontSize: number;
  color: string;
  textAlign: "left" | "center" | "right";
}

export interface IStickerLayer extends ILayerBase {
  type: LayerType.Sticker;
  assetId: AssetId;
}

export interface IShapeLayer extends ILayerBase {
  type: LayerType.Shape;
  shape: "rectangle" | "ellipse" | "polygon" | "star" | "path";
  fillColor: string;
  strokeColor: string;
  strokeWidth: number;
  cornerRadius: number;
}

export interface IGroupLayer extends ILayerBase {
  type: LayerType.Group;
  /** Composition Graph children, in render order. */
  childIds: LayerId[];
}

export type ILayer =
  IVideoLayer | IImageLayer | IAudioLayer | ITextLayer | IStickerLayer | IShapeLayer | IGroupLayer;
