import { RenderBackend } from "@motion-studio/shared";
import { placeholderColor } from "./placeholder-color";
import type { IRenderBackend, IRenderTargetSize } from "./render-backend";
import { sortRenderQueue } from "./render-queue";
import type { ISceneGraph, ISceneGraphNode } from "./scene-graph";
import { worldBounds } from "./transform";

/**
 * Pure-JS RGBA framebuffer backend — no canvas, no GPU, works anywhere
 * Node runs. This is the `Software` rung of the fallback chain
 * (`05-rendering-engine/renderer-overview.md`): headless CI and this
 * package's own test suite, where no real GPU/DOM is available. Draws each
 * Scene Graph node as a flat alpha-blended rect (see
 * `placeholder-color.ts` for why content isn't real pixels yet).
 */
export class SoftwareRenderBackend implements IRenderBackend {
  readonly kind = RenderBackend.Software;

  private width = 0;
  private height = 0;
  private framebuffer = new Uint8ClampedArray(0);

  init(target: IRenderTargetSize): void {
    this.width = target.width;
    this.height = target.height;
    this.framebuffer = new Uint8ClampedArray(this.width * this.height * 4);
  }

  drawFrame(sceneGraph: ISceneGraph): void {
    this.framebuffer.fill(0);
    for (const node of sortRenderQueue(sceneGraph.nodes)) {
      this.drawNode(node);
    }
  }

  dispose(): void {
    this.framebuffer = new Uint8ClampedArray(0);
  }

  /** Read-only view of the current frame's pixels — `width * height * 4` bytes, RGBA. */
  getFramebuffer(): Readonly<Uint8ClampedArray> {
    return this.framebuffer;
  }

  private drawNode(node: ISceneGraphNode): void {
    const rect = worldBounds(node.bounds, node.transform);
    const texture = node.texture?.kind === "raw-rgba" ? node.texture : undefined;

    const minX = Math.max(0, Math.floor(rect.x));
    const minY = Math.max(0, Math.floor(rect.y));
    const maxX = Math.min(this.width, Math.ceil(rect.x + rect.width));
    const maxY = Math.min(this.height, Math.ceil(rect.y + rect.height));

    if (texture) {
      for (let y = minY; y < maxY; y++) {
        for (let x = minX; x < maxX; x++) {
          const u = (x - rect.x) / rect.width;
          const v = (y - rect.y) / rect.height;
          const sampled = this.sampleTexture(texture, u, v);
          this.blendPixel(x, y, sampled.r, sampled.g, sampled.b, node.opacity * sampled.a);
        }
      }
      return;
    }

    const { r, g, b } = placeholderColor(node.layerId);
    for (let y = minY; y < maxY; y++) {
      for (let x = minX; x < maxX; x++) {
        this.blendPixel(x, y, r, g, b, node.opacity);
      }
    }
  }

  /** Nearest-neighbor sample — same AABB-only fidelity `worldBounds` already accepts for culling, not a true rotated-quad sample. */
  private sampleTexture(
    texture: { pixels: Uint8ClampedArray; width: number; height: number },
    u: number,
    v: number,
  ): { r: number; g: number; b: number; a: number } {
    const sx = Math.min(texture.width - 1, Math.max(0, Math.floor(u * texture.width)));
    const sy = Math.min(texture.height - 1, Math.max(0, Math.floor(v * texture.height)));
    const offset = (sy * texture.width + sx) * 4;
    const pixels = texture.pixels;
    return {
      r: pixels[offset] ?? 0,
      g: pixels[offset + 1] ?? 0,
      b: pixels[offset + 2] ?? 0,
      a: (pixels[offset + 3] ?? 255) / 255,
    };
  }

  private blendPixel(x: number, y: number, r: number, g: number, b: number, alpha: number): void {
    const offset = (y * this.width + x) * 4;
    const existing = this.framebuffer;
    existing[offset] = r * alpha + existing[offset]! * (1 - alpha);
    existing[offset + 1] = g * alpha + existing[offset + 1]! * (1 - alpha);
    existing[offset + 2] = b * alpha + existing[offset + 2]! * (1 - alpha);
    existing[offset + 3] = 255 * alpha + existing[offset + 3]! * (1 - alpha);
  }
}
