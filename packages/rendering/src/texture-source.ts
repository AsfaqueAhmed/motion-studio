import type { AssetId } from "@motion-studio/shared";

/**
 * A resolved, drawable representation of an asset's content, attached to a
 * Scene Graph node in place of `placeholderColor` when available. Two kinds
 * because backends need genuinely different input: Canvas2D/WebGL2/WebGPU
 * can draw/upload a `CanvasImageSource` directly (`ImageBitmap` for a
 * static image, `HTMLVideoElement` for a live video frame), while the
 * Software backend has no canvas/GPU available (`05-rendering-engine/
 * canvas-fallback.md`) and instead samples a plain RGBA byte buffer.
 * `CanvasImageSource` is an ambient `lib.dom` type (already used the same
 * way in `apps/studio`'s `thumbnail-generator.ts`) — safe here since
 * `tsconfig.base.json` includes `"DOM"` in `lib`, even though this package
 * never calls DOM APIs itself; only the app layer's resolver does.
 */
export type ITextureSource =
  | {
      readonly kind: "image-source";
      readonly source: CanvasImageSource;
      readonly width: number;
      readonly height: number;
    }
  | {
      readonly kind: "raw-rgba";
      readonly pixels: Uint8ClampedArray;
      readonly width: number;
      readonly height: number;
    };

/**
 * Injected into `RenderingEngine` by the host app (`CanvasPanel`) — decode
 * itself is a browser API concern the Rendering Engine never owns (CLAUDE.md
 * engine ownership table). `resolve` must be synchronous and side-effect-free
 * from the caller's perspective (a cache read), since it runs once per Scene
 * Graph node on every rendered frame — implementations that need to decode
 * asynchronously should cache and return `undefined` on a miss, resolving in
 * the background for a later frame.
 */
export interface ITextureSourceProvider {
  resolve(assetId: AssetId): ITextureSource | undefined;
}
