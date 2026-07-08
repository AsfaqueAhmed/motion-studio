import {
  toTick,
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
 * Every Layer's intrinsic local-space size (before `transform` is applied)
 * isn't modeled on `ILayer` anywhere yet — width/height for a decoded
 * image/video lives on the Asset Catalog entry (async lookup), and shapes
 * carry no width/height field at all (only `cornerRadius`/fill/stroke).
 * Flagged as an open item rather than silently invented per-type sizing;
 * every layer gets the same placeholder box, which `transform.scaleX/Y`
 * still stretches meaningfully.
 */
const PLACEHOLDER_BOUNDS: IBounds = { x: 0, y: 0, width: 200, height: 200 };

const TRANSFORM_KEYS = ["x", "y", "scaleX", "scaleY", "rotation"] as const;

/**
 * Timeline + Animation + Layer → Frame State (`ARCHITECTURE.md` §4). This
 * glue doesn't exist in any engine package — each engine only exposes the
 * pieces (`getTrackItemsSorted`, `evaluateAt`, `registry.get`), never the
 * evaluation itself, since "which tick, which composition" is an Editor
 * Service/Canvas-panel concern, not something any single engine owns.
 * Synchronous and side-effect-free so it can run once per rendered frame.
 */
export function buildFrameState(
  tick: Tick,
  compositionId: CompositionId,
  timelineEngine: TimelineEngine,
  layerEngine: LayerEngine,
  animationEngine: AnimationEngine,
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

      layers.push({
        layerId: layer.id,
        type: layer.type,
        transform,
        opacity,
        zIndex: trackIndex,
        bounds: PLACEHOLDER_BOUNDS,
        assetId: "assetId" in layer ? layer.assetId : undefined,
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
