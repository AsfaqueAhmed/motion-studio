import {
  DirtyTrackedGraph,
  type AssetId,
  type CompositionId,
  type IBounds,
  type IFrameState,
  type IFrameStateLayer,
  type ITransform2D,
  type LayerId,
  type LayerType,
  type Tick,
} from "@motion-studio/shared";
import type { ITextureSource, ITextureSourceProvider } from "./texture-source";

/**
 * One drawable node in a Scene Graph — see GLOSSARY.md "Scene Graph" and
 * ADR-006. Deliberately flat: Frame State layers already carry fully
 * evaluated (Timeline + Animation applied) local transforms, so Scene Graph
 * nodes have no parent/child of their own — that hierarchy lives one layer
 * up, in the persistent Composition Graph (`08-layer-engine/group-layer.md`).
 */
export interface ISceneGraphNode {
  readonly layerId: LayerId;
  readonly type: LayerType;
  readonly transform: ITransform2D;
  readonly opacity: number;
  readonly zIndex: number;
  readonly bounds: IBounds;
  readonly assetId: AssetId | undefined;
  /** Resolved by an injected `ITextureSourceProvider` — see `placeholder-color.ts` for the fallback when this is `undefined`. */
  readonly texture: ITextureSource | undefined;
  readonly properties: Readonly<Record<string, unknown>>;
}

/** Ephemeral, per-frame structure built from a Frame State and discarded after the frame is drawn (ADR-006). */
export interface ISceneGraph {
  readonly tick: Tick;
  readonly compositionId: CompositionId;
  readonly width: number;
  readonly height: number;
  readonly nodes: readonly ISceneGraphNode[];
}

function toSceneGraphNode(
  layer: IFrameStateLayer,
  textureProvider: ITextureSourceProvider | undefined,
): ISceneGraphNode {
  return {
    layerId: layer.layerId,
    type: layer.type,
    transform: layer.transform,
    opacity: layer.opacity,
    zIndex: layer.zIndex,
    bounds: layer.bounds,
    assetId: layer.assetId,
    texture: layer.assetId !== undefined ? textureProvider?.resolve(layer.assetId) : undefined,
    properties: layer.properties,
  };
}

/**
 * Builds the ephemeral Scene Graph for one Frame State. Pure with respect to
 * dirty-tracking (no side effects there), but `textureProvider.resolve` may
 * itself warm a decode cache in the background — see `ITextureSourceProvider`.
 */
export function buildSceneGraph(
  frameState: IFrameState,
  textureProvider?: ITextureSourceProvider,
): ISceneGraph {
  return {
    tick: frameState.tick,
    compositionId: frameState.compositionId,
    width: frameState.width,
    height: frameState.height,
    nodes: frameState.layers.map((layer) => toSceneGraphNode(layer, textureProvider)),
  };
}

function nodesEqual(a: ISceneGraphNode, b: ISceneGraphNode): boolean {
  return (
    a.opacity === b.opacity &&
    a.zIndex === b.zIndex &&
    a.transform.x === b.transform.x &&
    a.transform.y === b.transform.y &&
    a.transform.scaleX === b.transform.scaleX &&
    a.transform.scaleY === b.transform.scaleY &&
    a.transform.rotation === b.transform.rotation &&
    a.transform.anchorX === b.transform.anchorX &&
    a.transform.anchorY === b.transform.anchorY &&
    a.bounds.x === b.bounds.x &&
    a.bounds.y === b.bounds.y &&
    a.bounds.width === b.bounds.width &&
    a.bounds.height === b.bounds.height &&
    shallowEqualProperties(a.properties, b.properties)
  );
}

function shallowEqualProperties(
  a: Readonly<Record<string, unknown>>,
  b: Readonly<Record<string, unknown>>,
): boolean {
  const aKeys = Object.keys(a);
  const bKeys = Object.keys(b);
  if (aKeys.length !== bKeys.length) {
    return false;
  }
  return aKeys.every((key) => Object.is(a[key], b[key]));
}

/**
 * Diffs successive Scene Graphs against the generic `DirtyTrackedGraph`
 * primitive (ADR-005 #1) so the Rendering Engine only re-renders nodes whose
 * inputs actually changed since the last frame — see
 * `05-rendering-engine/frame-rendering.md`. Scene Graph nodes are flat, so
 * the accessor's parent/child edges are trivially empty; bounds/visibility
 * still let `queryDirtyVisible` combine dirtiness with viewport culling.
 */
export class SceneGraphDirtyTracker {
  private previous: ReadonlyMap<LayerId, ISceneGraphNode> | null = null;
  private current: ReadonlyMap<LayerId, ISceneGraphNode> = new Map();

  readonly graph = new DirtyTrackedGraph<LayerId>({
    getParentId: () => null,
    getChildIds: () => [],
    getBounds: (id) => this.current.get(id)?.bounds ?? { x: 0, y: 0, width: 0, height: 0 },
    isVisible: () => true,
  });

  /** Call once per built Scene Graph, before querying dirty/visible nodes. */
  update(sceneGraph: ISceneGraph): void {
    this.current = new Map(sceneGraph.nodes.map((node) => [node.layerId, node]));
    this.graph.clearAll();
    if (this.previous === null) {
      for (const id of this.current.keys()) {
        this.graph.markDirty(id);
      }
    } else {
      const previous = this.previous;
      for (const [id, node] of this.current) {
        const previousNode = previous.get(id);
        if (!previousNode || !nodesEqual(previousNode, node)) {
          this.graph.markDirty(id);
        }
      }
    }
    this.previous = this.current;
  }
}
