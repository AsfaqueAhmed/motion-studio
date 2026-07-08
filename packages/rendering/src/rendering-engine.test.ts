import {
  LayerType,
  createCompositionId,
  createLayerId,
  toTick,
  type IFrameState,
  type IFrameStateLayer,
} from "@motion-studio/shared";
import { describe, expect, it } from "vitest";
import { RenderingEngine } from "./rendering-engine";
import { SoftwareRenderBackend } from "./software-backend";

function makeLayer(overrides: Partial<IFrameStateLayer> = {}): IFrameStateLayer {
  return {
    layerId: createLayerId("layer-1"),
    type: LayerType.Shape,
    transform: { x: 0, y: 0, scaleX: 1, scaleY: 1, rotation: 0, anchorX: 0, anchorY: 0 },
    opacity: 1,
    zIndex: 0,
    bounds: { x: 0, y: 0, width: 4, height: 4 },
    assetId: undefined,
    properties: {},
    ...overrides,
  };
}

function makeFrameState(layers: IFrameStateLayer[]): IFrameState {
  return {
    tick: toTick(0),
    compositionId: createCompositionId("comp-1"),
    width: 8,
    height: 8,
    layers,
  };
}

describe("RenderingEngine", () => {
  it("has the correct engine name", () => {
    expect(new RenderingEngine(new SoftwareRenderBackend()).name).toBe("Rendering");
  });

  it("initializes the backend via setTarget", async () => {
    const backend = new SoftwareRenderBackend();
    const engine = new RenderingEngine(backend);
    await engine.setTarget({ width: 8, height: 8 });
    expect(backend.getFramebuffer()).toHaveLength(8 * 8 * 4);
  });

  it("renderFrame builds and returns the Scene Graph and draws it", async () => {
    const backend = new SoftwareRenderBackend();
    const engine = new RenderingEngine(backend);
    await engine.setTarget({ width: 8, height: 8 });

    const sceneGraph = await engine.renderFrame(makeFrameState([makeLayer()]));
    expect(sceneGraph.nodes).toHaveLength(1);
    expect(backend.getFramebuffer()[3]).toBeGreaterThan(0);
  });

  it("marks a layer dirty on the first frame and clean once unchanged", async () => {
    const engine = new RenderingEngine(new SoftwareRenderBackend());
    await engine.setTarget({ width: 8, height: 8 });
    const layerId = createLayerId("layer-1");

    await engine.renderFrame(makeFrameState([makeLayer({ layerId })]));
    expect(engine.isDirty(layerId)).toBe(true);

    await engine.renderFrame(makeFrameState([makeLayer({ layerId })]));
    expect(engine.isDirty(layerId)).toBe(false);
  });

  it("dispose() tears down the backend", async () => {
    const backend = new SoftwareRenderBackend();
    const engine = new RenderingEngine(backend);
    await engine.setTarget({ width: 8, height: 8 });
    await engine.dispose();
    expect(backend.getFramebuffer()).toHaveLength(0);
  });
});
