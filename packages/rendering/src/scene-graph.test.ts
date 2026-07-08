import {
  LayerType,
  createCompositionId,
  createLayerId,
  toTick,
  type IFrameState,
  type IFrameStateLayer,
} from "@motion-studio/shared";
import { describe, expect, it } from "vitest";
import { buildSceneGraph, SceneGraphDirtyTracker } from "./scene-graph";

function makeLayer(overrides: Partial<IFrameStateLayer> = {}): IFrameStateLayer {
  return {
    layerId: createLayerId("layer-1"),
    type: LayerType.Shape,
    transform: { x: 0, y: 0, scaleX: 1, scaleY: 1, rotation: 0, anchorX: 0, anchorY: 0 },
    opacity: 1,
    zIndex: 0,
    bounds: { x: 0, y: 0, width: 100, height: 100 },
    assetId: undefined,
    properties: {},
    ...overrides,
  };
}

function makeFrameState(layers: IFrameStateLayer[]): IFrameState {
  return {
    tick: toTick(0),
    compositionId: createCompositionId("comp-1"),
    width: 1920,
    height: 1080,
    layers,
  };
}

describe("buildSceneGraph", () => {
  it("carries frame dimensions and flattens layers into nodes", () => {
    const layer = makeLayer();
    const sceneGraph = buildSceneGraph(makeFrameState([layer]));
    expect(sceneGraph.width).toBe(1920);
    expect(sceneGraph.height).toBe(1080);
    expect(sceneGraph.nodes).toHaveLength(1);
    expect(sceneGraph.nodes[0]).toMatchObject({ layerId: layer.layerId, type: LayerType.Shape });
  });
});

describe("SceneGraphDirtyTracker", () => {
  it("marks every node dirty on the first frame", () => {
    const tracker = new SceneGraphDirtyTracker();
    const sceneGraph = buildSceneGraph(
      makeFrameState([makeLayer({ layerId: createLayerId("a") })]),
    );
    tracker.update(sceneGraph);
    expect(tracker.graph.isDirty(createLayerId("a"))).toBe(true);
  });

  it("only marks changed nodes dirty on subsequent frames", () => {
    const tracker = new SceneGraphDirtyTracker();
    const a = createLayerId("a");
    const b = createLayerId("b");

    tracker.update(
      buildSceneGraph(makeFrameState([makeLayer({ layerId: a }), makeLayer({ layerId: b })])),
    );

    tracker.update(
      buildSceneGraph(
        makeFrameState([makeLayer({ layerId: a, opacity: 0.5 }), makeLayer({ layerId: b })]),
      ),
    );

    expect(tracker.graph.isDirty(a)).toBe(true);
    expect(tracker.graph.isDirty(b)).toBe(false);
  });

  it("marks a node dirty when a property value changes", () => {
    const tracker = new SceneGraphDirtyTracker();
    const a = createLayerId("a");
    tracker.update(
      buildSceneGraph(makeFrameState([makeLayer({ layerId: a, properties: { fill: "red" } })])),
    );
    tracker.update(
      buildSceneGraph(makeFrameState([makeLayer({ layerId: a, properties: { fill: "blue" } })])),
    );
    expect(tracker.graph.isDirty(a)).toBe(true);
  });

  it("does not mark a node dirty when nothing changed", () => {
    const tracker = new SceneGraphDirtyTracker();
    const a = createLayerId("a");
    tracker.update(buildSceneGraph(makeFrameState([makeLayer({ layerId: a })])));
    tracker.update(buildSceneGraph(makeFrameState([makeLayer({ layerId: a })])));
    expect(tracker.graph.isDirty(a)).toBe(false);
  });
});
