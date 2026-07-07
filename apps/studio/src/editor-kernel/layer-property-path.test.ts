import { createAssetId, createLayerId } from "@motion-studio/shared";
import { createImageLayer } from "@motion-studio/layer";
import { describe, expect, it } from "vitest";
import { getLayerPropertyValue, setLayerPropertyValue } from "./layer-property-path";

describe("layer property path", () => {
  it("reads and writes a top-level field", () => {
    const layer = createImageLayer({
      id: createLayerId("l1"),
      name: "Image",
      assetId: createAssetId("a1"),
    });
    expect(getLayerPropertyValue(layer, "opacity")).toBe(1);
    setLayerPropertyValue(layer, "opacity", 0.5);
    expect(layer.opacity).toBe(0.5);
  });

  it("reads and writes a transform.* field without disturbing sibling fields", () => {
    const layer = createImageLayer({
      id: createLayerId("l1"),
      name: "Image",
      assetId: createAssetId("a1"),
    });
    expect(getLayerPropertyValue(layer, "transform.x")).toBe(0);
    setLayerPropertyValue(layer, "transform.x", 10);
    expect(layer.transform.x).toBe(10);
    expect(layer.transform.y).toBe(0);
  });
});
