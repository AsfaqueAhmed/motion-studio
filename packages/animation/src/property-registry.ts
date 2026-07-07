import type { LayerType } from "@motion-studio/shared";
import type { IPropertyDefinition } from "./property-definition";

function key(layerType: LayerType, propertyKey: string): string {
  return `${layerType}:${propertyKey}`;
}

/**
 * Registers every keyframeable property per Layer type: value type,
 * default, interpolator, validator. Plugins extend this with new properties
 * (e.g. a Particle effect's `Emission Rate`) without modifying the
 * Animation Engine itself. See GLOSSARY.md "AnimatablePropertyRegistry" and
 * ADR-008.
 */
export class AnimatablePropertyRegistry {
  private readonly definitions = new Map<string, IPropertyDefinition>();

  register(definition: IPropertyDefinition): void {
    const k = key(definition.layerType, definition.propertyKey);
    if (this.definitions.has(k)) {
      throw new Error(
        `AnimatablePropertyRegistry: "${definition.propertyKey}" already registered for layer type "${definition.layerType}"`,
      );
    }
    this.definitions.set(k, definition);
  }

  get(layerType: LayerType, propertyKey: string): IPropertyDefinition | undefined {
    return this.definitions.get(key(layerType, propertyKey));
  }

  require(layerType: LayerType, propertyKey: string): IPropertyDefinition {
    const definition = this.get(layerType, propertyKey);
    if (!definition) {
      throw new Error(
        `AnimatablePropertyRegistry: unknown property "${propertyKey}" for layer type "${layerType}"`,
      );
    }
    return definition;
  }

  has(layerType: LayerType, propertyKey: string): boolean {
    return this.definitions.has(key(layerType, propertyKey));
  }

  getAll(layerType: LayerType): IPropertyDefinition[] {
    return Array.from(this.definitions.values()).filter(
      (definition) => definition.layerType === layerType,
    );
  }

  clear(): void {
    this.definitions.clear();
  }
}
