import type { IBounds } from "./dirty-graph";
import type { LayerType } from "./enums";
import type { AssetId, CompositionId, LayerId } from "./ids";
import type { ITransform2D } from "./layer";
import type { Tick } from "./tick";

/**
 * One Layer's fully-evaluated state at a given tick: Layer data + Animation
 * evaluation already applied. See ARCHITECTURE.md §4.
 */
export interface IFrameStateLayer {
  readonly layerId: LayerId;
  readonly type: LayerType;
  readonly transform: ITransform2D;
  readonly opacity: number;
  readonly zIndex: number;
  /** Local-space (pre-transform) bounds — the Rendering Engine's Scene Graph uses this for culling/virtualization (ADR-005 primitive #1). */
  readonly bounds: IBounds;
  /** Present for Image/Video/Sticker/Audio layers — the asset backing this layer's content, if any. */
  readonly assetId: AssetId | undefined;
  readonly properties: Readonly<Record<string, unknown>>;
}

/**
 * Immutable, deterministic snapshot of everything visible/audible/active at
 * a given tick. Produced by evaluating Timeline + Animation + Layer data
 * together; consumed identically by the Rendering Engine (preview) and the
 * Export Engine (offline render) — this identity is what guarantees
 * preview == export. See ARCHITECTURE.md §4 and GLOSSARY.md "Frame State".
 */
export interface IFrameState {
  readonly tick: Tick;
  readonly compositionId: CompositionId;
  readonly width: number;
  readonly height: number;
  readonly layers: ReadonlyArray<IFrameStateLayer>;
}
