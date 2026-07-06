import { LayerType, type IGroupLayer, type ILayer } from "@motion-studio/shared";

/** Only Group layers are containers; every other layer type is a leaf. */
export function isGroupLayer(layer: ILayer): layer is IGroupLayer {
  return layer.type === LayerType.Group;
}
