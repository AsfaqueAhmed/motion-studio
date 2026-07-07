import type { IBounds, ITransform2D } from "@motion-studio/shared";

/**
 * World-space axis-aligned bounding box of `bounds` (in the layer's local
 * space) after applying `transform`: anchor, scale, rotation, then
 * translate — the standard 2D layer transform order used throughout the
 * Layer/Timeline/Animation engines (`ITransform2D`, `08-layer-engine/`).
 * Rotation makes the result an AABB around the rotated corners, not a
 * rotated rect — sufficient for culling/dirty-rect purposes.
 */
export function worldBounds(bounds: IBounds, transform: ITransform2D): IBounds {
  const localCorners: Array<[number, number]> = [
    [bounds.x - transform.anchorX, bounds.y - transform.anchorY],
    [bounds.x + bounds.width - transform.anchorX, bounds.y - transform.anchorY],
    [bounds.x + bounds.width - transform.anchorX, bounds.y + bounds.height - transform.anchorY],
    [bounds.x - transform.anchorX, bounds.y + bounds.height - transform.anchorY],
  ];

  const cos = Math.cos(transform.rotation);
  const sin = Math.sin(transform.rotation);

  const worldCorners = localCorners.map(([localX, localY]) => {
    const scaledX = localX * transform.scaleX;
    const scaledY = localY * transform.scaleY;
    const rotatedX = scaledX * cos - scaledY * sin;
    const rotatedY = scaledX * sin + scaledY * cos;
    return [rotatedX + transform.x, rotatedY + transform.y] as const;
  });

  const xs = worldCorners.map(([x]) => x);
  const ys = worldCorners.map(([, y]) => y);
  const minX = Math.min(...xs);
  const minY = Math.min(...ys);
  const maxX = Math.max(...xs);
  const maxY = Math.max(...ys);

  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
}
