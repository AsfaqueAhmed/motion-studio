import { Hierarchy, type ILayer, type LayerId } from "@motion-studio/shared";
import { isGroupLayer } from "./layer-guards";
import type { LayerRegistry } from "./layer-registry";

/**
 * The persistent Composition Graph (GLOSSARY.md, ADR-006) — parent/child
 * structure of Layers, saved with the project. Built on the generic
 * `Hierarchy` primitive (ADR-005 #2) rather than a bespoke tree, and is the
 * single place allowed to mutate `ILayerBase.parentId` /
 * `IGroupLayer.childIds` once a layer has been added, so those two fields
 * can never drift out of sync with each other.
 */
export class CompositionGraph {
  private readonly hierarchy: Hierarchy<LayerId>;

  constructor(private readonly registry: LayerRegistry) {
    this.hierarchy = new Hierarchy<LayerId>({
      getParentId: (id) => this.requireLayer(id).parentId,
      getChildIds: (id) => {
        const layer = this.requireLayer(id);
        return isGroupLayer(layer) ? layer.childIds : [];
      },
    });
  }

  /**
   * Registers a new layer and, if it declares a `parentId`, attaches it as
   * that Group layer's child. Prefer this over calling `LayerRegistry.add`
   * directly whenever the layer has a parent, so `childIds` stays in sync.
   */
  addLayer(layer: ILayer): void {
    if (layer.parentId !== null) {
      const parent = this.requireLayer(layer.parentId);
      if (!isGroupLayer(parent)) {
        throw new Error(
          `CompositionGraph: layer "${layer.parentId}" is not a Group layer and cannot have children.`,
        );
      }
    }
    this.registry.add(layer);
    if (layer.parentId !== null) {
      const parent = this.requireLayer(layer.parentId);
      if (isGroupLayer(parent)) {
        parent.childIds = [...parent.childIds, layer.id];
      }
    }
  }

  /**
   * Unregisters a layer. Fails fast if it still has children — cascade vs.
   * detach-children-to-root on delete is an explicit open question (see
   * `docs/08-layer-engine/overview.md` "Interaction with Timeline"); callers
   * must reparent or remove children first rather than this method silently
   * choosing a cascade policy.
   */
  removeLayer(id: LayerId): void {
    const layer = this.requireLayer(id);
    if (this.getChildren(id).length > 0) {
      throw new Error(
        `CompositionGraph: cannot remove "${id}" — it still has children; reparent or remove them first.`,
      );
    }
    if (layer.parentId !== null) {
      const parent = this.requireLayer(layer.parentId);
      if (isGroupLayer(parent)) {
        parent.childIds = parent.childIds.filter((childId) => childId !== id);
      }
    }
    this.registry.remove(id);
  }

  getParent(id: LayerId): LayerId | null {
    return this.requireLayer(id).parentId;
  }

  getChildren(id: LayerId): LayerId[] {
    const layer = this.requireLayer(id);
    return isGroupLayer(layer) ? [...layer.childIds] : [];
  }

  getAncestors(id: LayerId): LayerId[] {
    this.requireLayer(id);
    return this.hierarchy.getAncestors(id);
  }

  getDescendants(id: LayerId): LayerId[] {
    this.requireLayer(id);
    return this.hierarchy.getDescendants(id);
  }

  /** Effective visibility = this layer and every ancestor are visible. */
  isEffectivelyVisible(id: LayerId): boolean {
    const layer = this.requireLayer(id);
    if (!layer.visible) {
      return false;
    }
    return this.getAncestors(id).every((ancestorId) => this.requireLayer(ancestorId).visible);
  }

  /** Effective lock = this layer or any ancestor is locked. */
  isEffectivelyLocked(id: LayerId): boolean {
    const layer = this.requireLayer(id);
    if (layer.locked) {
      return true;
    }
    return this.getAncestors(id).some((ancestorId) => this.requireLayer(ancestorId).locked);
  }

  /**
   * Moves `id` to be a child of `newParentId` (or a root, if null).
   * Validates the new parent exists and is a Group layer, and that the
   * move would not create a cycle, before touching any state.
   */
  reparent(id: LayerId, newParentId: LayerId | null): void {
    const layer = this.requireLayer(id);
    if (newParentId !== null) {
      const newParent = this.requireLayer(newParentId);
      if (!isGroupLayer(newParent)) {
        throw new Error(
          `CompositionGraph: layer "${newParentId}" is not a Group layer and cannot have children.`,
        );
      }
    }
    this.hierarchy.assertNoCycle(id, newParentId);

    const oldParentId = layer.parentId;
    if (oldParentId !== null) {
      const oldParent = this.requireLayer(oldParentId);
      if (isGroupLayer(oldParent)) {
        oldParent.childIds = oldParent.childIds.filter((childId) => childId !== id);
      }
    }

    layer.parentId = newParentId;

    if (newParentId !== null) {
      const newParent = this.requireLayer(newParentId);
      if (isGroupLayer(newParent)) {
        newParent.childIds = [...newParent.childIds, id];
      }
    }
  }

  private requireLayer(id: LayerId): ILayer {
    const layer = this.registry.get(id);
    if (!layer) {
      throw new Error(`CompositionGraph: unknown layer: "${id}"`);
    }
    return layer;
  }
}
