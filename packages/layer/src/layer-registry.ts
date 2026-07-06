import type { ILayer, LayerId } from "@motion-studio/shared";

/**
 * In-memory source of truth for `ILayer` objects, keyed by id. Deliberately
 * has no hierarchy awareness — parent/child invariants live in
 * `CompositionGraph`, which is the only thing that should mutate a layer's
 * `parentId` or a group's `childIds` after creation.
 */
export class LayerRegistry {
  private readonly layers = new Map<LayerId, ILayer>();

  add(layer: ILayer): void {
    if (this.layers.has(layer.id)) {
      throw new Error(`LayerRegistry: layer already registered: "${layer.id}"`);
    }
    this.layers.set(layer.id, layer);
  }

  get(id: LayerId): ILayer | undefined {
    return this.layers.get(id);
  }

  has(id: LayerId): boolean {
    return this.layers.has(id);
  }

  remove(id: LayerId): void {
    if (!this.layers.delete(id)) {
      throw new Error(`LayerRegistry: unknown layer: "${id}"`);
    }
  }

  getAll(): ILayer[] {
    return Array.from(this.layers.values());
  }

  clear(): void {
    this.layers.clear();
  }
}
