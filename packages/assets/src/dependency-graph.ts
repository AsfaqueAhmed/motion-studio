import { Hierarchy, type AssetId } from "@motion-studio/shared";

/**
 * Which references (in practice: TrackItems, indirectly, via the Layer
 * that holds an `assetId` — see `ILayerBase`) point at a given asset.
 * PLAN.md Phase 12 "Asset Dependency Graph" / `docs/14-assets/metadata.md`.
 *
 * Built on the generic `Hierarchy` primitive (ADR-005 #2) instead of a
 * bespoke structure: an asset is a one-level "parent," reference ids are
 * its leaves. `Hierarchy` itself owns no data (see its own doc comment),
 * so the parent/child maps live here.
 *
 * The Asset Manager never reaches into Layer/Timeline directly — no
 * engine imports another engine's concrete classes (CLAUDE.md "the one
 * rule"). Callers (today: tests; eventually command handlers in the
 * Editor Service layer) call `registerReference`/`unregisterReference`
 * whenever a TrackItem starts or stops pointing at an asset.
 */
export class AssetDependencyGraph {
  private readonly parentOf = new Map<string, AssetId>();
  private readonly childrenOf = new Map<AssetId, Set<string>>();

  private readonly hierarchy = new Hierarchy<string>({
    getParentId: (id) => this.parentOf.get(id) ?? null,
    getChildIds: (id) => Array.from(this.childrenOf.get(id as AssetId) ?? []),
  });

  registerReference(assetId: AssetId, referenceId: string): void {
    this.parentOf.set(referenceId, assetId);
    const children = this.childrenOf.get(assetId) ?? new Set<string>();
    children.add(referenceId);
    this.childrenOf.set(assetId, children);
  }

  unregisterReference(referenceId: string): void {
    const assetId = this.parentOf.get(referenceId);
    if (assetId === undefined) {
      return;
    }
    this.parentOf.delete(referenceId);
    this.childrenOf.get(assetId)?.delete(referenceId);
  }

  /** All reference ids currently pointing at `assetId`. */
  getReferences(assetId: AssetId): string[] {
    return this.hierarchy.getDescendants(assetId);
  }

  /** The asset `referenceId` points at, if it's currently registered. */
  getAssetFor(referenceId: string): AssetId | undefined {
    return this.hierarchy.getAncestors(referenceId)[0] as AssetId | undefined;
  }

  isUnused(assetId: AssetId): boolean {
    return this.getReferences(assetId).length === 0;
  }

  /** "Unused assets" view (PLAN.md) = assets with zero incoming dependency references. */
  listUnused(allAssetIds: readonly AssetId[]): AssetId[] {
    return allAssetIds.filter((id) => this.isUnused(id));
  }
}
