import type { IEngine, IFrameState, LayerId } from "@motion-studio/shared";
import type { IRenderBackend, IRenderTargetSize } from "./render-backend";
import { buildSceneGraph, SceneGraphDirtyTracker, type ISceneGraph } from "./scene-graph";
import type { ITextureSourceProvider } from "./texture-source";

/**
 * Owns "Frame State → (ephemeral, per-frame) Scene Graph → Render Graph →
 * GPU backend → Canvas" (CLAUDE.md engine ownership table). Never imports
 * Timeline/Animation/Layer/Storage internals — it only ever receives a
 * Frame State and produces pixels through the injected `IRenderBackend`
 * (ADR-004: the one GPU abstraction). Which concrete backend to construct
 * (WebGPU/WebGL2/Canvas2D/Software) is a host-app decision — see
 * `backend-detection.ts`'s `selectBackend` — because only the host has the
 * real `<canvas>`/GPU device to hand the backend its dependencies.
 */
export class RenderingEngine implements IEngine {
  readonly name = "Rendering";

  private readonly backend: IRenderBackend;
  private readonly textureProvider: ITextureSourceProvider | undefined;
  private readonly dirtyTracker = new SceneGraphDirtyTracker();

  constructor(backend: IRenderBackend, textureProvider?: ITextureSourceProvider) {
    this.backend = backend;
    this.textureProvider = textureProvider;
  }

  initialize(): void {}

  ready(): void {}

  async dispose(): Promise<void> {
    await this.backend.dispose();
  }

  async setTarget(size: IRenderTargetSize): Promise<void> {
    await this.backend.init(size);
  }

  /** Builds the Scene Graph for `frameState`, updates dirty-tracking, and draws it. Returns the built Scene Graph for inspection/testing. */
  async renderFrame(frameState: IFrameState): Promise<ISceneGraph> {
    const sceneGraph = buildSceneGraph(frameState, this.textureProvider);
    this.dirtyTracker.update(sceneGraph);
    await this.backend.drawFrame(sceneGraph);
    return sceneGraph;
  }

  isDirty(layerId: LayerId): boolean {
    return this.dirtyTracker.graph.isDirty(layerId);
  }
}
