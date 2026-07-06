import type { CompositionId, IComposition } from "@motion-studio/shared";

/** In-memory source of truth for `IComposition` objects, keyed by id. */
export class CompositionRegistry {
  private readonly compositions = new Map<CompositionId, IComposition>();

  add(composition: IComposition): void {
    if (this.compositions.has(composition.id)) {
      throw new Error(`CompositionRegistry: composition already registered: "${composition.id}"`);
    }
    this.compositions.set(composition.id, composition);
  }

  get(id: CompositionId): IComposition | undefined {
    return this.compositions.get(id);
  }

  has(id: CompositionId): boolean {
    return this.compositions.has(id);
  }

  remove(id: CompositionId): void {
    if (!this.compositions.delete(id)) {
      throw new Error(`CompositionRegistry: unknown composition: "${id}"`);
    }
  }

  getAll(): IComposition[] {
    return Array.from(this.compositions.values());
  }

  clear(): void {
    this.compositions.clear();
  }
}
