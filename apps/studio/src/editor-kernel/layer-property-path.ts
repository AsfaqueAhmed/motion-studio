import type { ILayer } from "@motion-studio/shared";

/**
 * Every animatable property key registered in `AnimatablePropertyRegistry`
 * (`@motion-studio/animation`) is either a bare top-level field (`"opacity"`,
 * `"content"`, `"fillColor"`, ...) or one level into `transform`
 * (`"transform.x"`, `"transform.rotation"`, ...) — there's no deeper
 * nesting anywhere in `ILayer`, so a one-level path reader/writer is
 * sufficient. Shared by the Inspector panel (reading current values) and
 * `UpdateLayerCommand` (applying/undoing an edit) so both agree on the same
 * path shape.
 */
export function getLayerPropertyValue(layer: ILayer, propertyKey: string): unknown {
  if (propertyKey.startsWith("transform.")) {
    const field = propertyKey.slice("transform.".length) as keyof ILayer["transform"];
    return layer.transform[field];
  }
  return (layer as unknown as Record<string, unknown>)[propertyKey];
}

export function setLayerPropertyValue(layer: ILayer, propertyKey: string, value: unknown): void {
  if (propertyKey.startsWith("transform.")) {
    const field = propertyKey.slice("transform.".length) as keyof ILayer["transform"];
    layer.transform = { ...layer.transform, [field]: value as number };
    return;
  }
  (layer as unknown as Record<string, unknown>)[propertyKey] = value;
}
