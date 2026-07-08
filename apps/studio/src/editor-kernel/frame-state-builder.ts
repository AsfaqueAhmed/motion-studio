import {
  toTick,
  type AssetId,
  type CompositionId,
  type IBounds,
  type IFrameState,
  type IFrameStateLayer,
  type ITransform2D,
  type Tick,
} from "@motion-studio/shared";
import type { AnimationEngine } from "@motion-studio/animation";
import type { LayerEngine } from "@motion-studio/layer";
import type { TimelineEngine } from "@motion-studio/timeline";
import { getLayerPropertyValue } from "./layer-property-path";

/**
 * Fallback for a layer whose intrinsic size isn't resolved yet — either it
 * has no backing asset (Text/Shape/Group: no `assetId`, no engine models
 * their intrinsic size yet, a separate open item) or its asset's real
 * dimensions haven't finished resolving (`dimensionsLookup` miss on the
 * first render after the layer appears). `transform.scaleX/Y` still
 * stretches this meaningfully either way.
 */
const PLACEHOLDER_BOUNDS: IBounds = { x: 0, y: 0, width: 200, height: 200 };

/** Also the set the unified keyframe toggle animates together — see `InspectorEditorService.toggleKeyframe`. */
export const TRANSFORM_KEYS = ["x", "y", "scaleX", "scaleY", "rotation"] as const;

/**
 * Timeline + Animation + Layer → Frame State (`ARCHITECTURE.md` §4). This
 * glue doesn't exist in any engine package — each engine only exposes the
 * pieces (`getTrackItemsSorted`, `evaluateAt`, `registry.get`), never the
 * evaluation itself, since "which tick, which composition" is an Editor
 * Service/Canvas-panel concern, not something any single engine owns.
 * Synchronous and side-effect-free so it can run once per rendered frame —
 * `dimensionsLookup` must be a synchronous cache read too (see
 * `TextureSourceResolver.getDimensions`), never an async asset lookup.
 */
export function buildFrameState(
  tick: Tick,
  compositionId: CompositionId,
  timelineEngine: TimelineEngine,
  layerEngine: LayerEngine,
  animationEngine: AnimationEngine,
  dimensionsLookup?: (assetId: AssetId) => IBounds | undefined,
): IFrameState {
  const composition = timelineEngine.requireComposition(compositionId);
  const layers: IFrameStateLayer[] = [];

  composition.tracks.forEach((trackId, trackIndex) => {
    const track = timelineEngine.requireTrack(trackId);
    for (const item of timelineEngine.getTrackItemsSorted(track.id)) {
      const activeUntil = toTick(item.startTick + item.durationTicks);
      if (tick < item.startTick || tick >= activeUntil) {
        continue;
      }
      const layer = layerEngine.registry.get(item.layerId);
      if (!layer || !layerEngine.compositionGraph.isEffectivelyVisible(layer.id)) {
        continue;
      }

      const transform: ITransform2D = { ...layer.transform };
      for (const key of TRANSFORM_KEYS) {
        const evaluated = animationEngine.evaluateAt(layer.id, `transform.${key}`, tick);
        if (evaluated !== undefined) {
          transform[key] = evaluated as number;
        }
      }

      const evaluatedOpacity = animationEngine.evaluateAt(layer.id, "opacity", tick);
      const opacity = evaluatedOpacity !== undefined ? (evaluatedOpacity as number) : layer.opacity;

      const properties: Record<string, unknown> = {};
      for (const definition of animationEngine.properties.getAll(layer.type)) {
        if (
          definition.propertyKey.startsWith("transform.") ||
          definition.propertyKey === "opacity"
        ) {
          continue;
        }
        const evaluated = animationEngine.evaluateAt(layer.id, definition.propertyKey, tick);
        properties[definition.propertyKey] =
          evaluated !== undefined
            ? evaluated
            : getLayerPropertyValue(layer, definition.propertyKey);
      }

      const assetId = "assetId" in layer ? layer.assetId : undefined;
      const bounds =
        (assetId !== undefined ? dimensionsLookup?.(assetId) : undefined) ?? PLACEHOLDER_BOUNDS;

      layers.push({
        layerId: layer.id,
        type: layer.type,
        transform,
        opacity,
        zIndex: trackIndex,
        bounds,
        assetId,
        properties,
      });
    }
  });

  return {
    tick,
    compositionId,
    width: composition.width,
    height: composition.height,
    layers,
  };
}
