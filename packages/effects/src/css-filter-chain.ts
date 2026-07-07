import type { EffectNodeId } from "@motion-studio/shared";
import type { IEffectNode } from "./effect-node";

export interface ICssFilterChainResult {
  /** Combined CSS filter string (e.g. `"blur(4px) brightness(1.2)"`), empty if no node contributed one. */
  readonly filter: string;
  /** Ids of nodes in the chain with no CSS-expressible equivalent (blend modes, transitions, temperature/tint). */
  readonly unsupportedIds: readonly EffectNodeId[];
}

/**
 * Composes an ordered effect chain (dependency-first, e.g. from
 * `orderEffectChain`) into one CSS filter string for the Canvas2D fallback
 * path (`filters.md`, CLAUDE.md rendering fallback chain). CSS filters
 * apply in list order, matching the chain's dependency order — so as long
 * as every node in the chain sets `cssFilter`, this is a faithful
 * approximation. Nodes without one (blend modes, transitions, and color
 * adjustments using temperature/tint) are skipped and reported in
 * `unsupportedIds` so a caller can decide whether the approximation is
 * acceptable or whether the Canvas2D backend must fall back further still
 * (e.g. to `Software`).
 */
export function composeCssFilterChain(nodes: readonly IEffectNode[]): ICssFilterChainResult {
  const filters: string[] = [];
  const unsupportedIds: EffectNodeId[] = [];
  for (const node of nodes) {
    if (node.cssFilter !== undefined) {
      filters.push(node.cssFilter);
    } else {
      unsupportedIds.push(node.id);
    }
  }
  return { filter: filters.join(" "), unsupportedIds };
}
