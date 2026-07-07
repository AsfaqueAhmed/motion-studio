import type { ISceneGraphNode } from "./scene-graph";

/**
 * Blend modes consumed by the Render Graph (`09-effects/`, not yet built —
 * Phase 8). Read from a node's `properties` bag today since there's no
 * dedicated Effects data model yet; defaults to `"normal"`.
 */
export type BlendMode = "normal" | "multiply" | "screen" | "overlay";

function getBlendMode(node: ISceneGraphNode): BlendMode {
  const value = node.properties["blendMode"];
  return value === "multiply" || value === "screen" || value === "overlay" ? value : "normal";
}

function isTransparent(node: ISceneGraphNode): boolean {
  return node.opacity < 1;
}

/**
 * Orders a Scene Graph's nodes for GPU submission: z-index, then blend
 * mode, then opaque-before-transparent, then layer type (today's stand-in
 * for "material" — each `LayerType` will need its own shader/pipeline) —
 * see `05-rendering-engine/renderer-overview.md` "Owns". Grouping by these
 * keys (rather than z-index alone) minimizes GPU pipeline/state changes
 * between consecutive draw calls.
 */
export function sortRenderQueue(nodes: readonly ISceneGraphNode[]): ISceneGraphNode[] {
  return [...nodes].sort((a, b) => {
    if (a.zIndex !== b.zIndex) {
      return a.zIndex - b.zIndex;
    }
    const blendCompare = getBlendMode(a).localeCompare(getBlendMode(b));
    if (blendCompare !== 0) {
      return blendCompare;
    }
    const transparencyCompare = Number(isTransparent(a)) - Number(isTransparent(b));
    if (transparencyCompare !== 0) {
      return transparencyCompare;
    }
    return a.type.localeCompare(b.type);
  });
}
