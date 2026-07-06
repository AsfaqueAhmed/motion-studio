import { createAssetId, createLayerId } from "@motion-studio/shared";
import { describe, expect, it } from "vitest";
import {
  createAudioLayer,
  createGroupLayer,
  createImageLayer,
  createShapeLayer,
  createStickerLayer,
  createTextLayer,
  createVideoLayer,
} from "./layer-factory";

const layerId = createLayerId("layer-1");
const assetId = createAssetId("asset-1");

describe("layer factories", () => {
  it("createVideoLayer applies defaults", () => {
    const layer = createVideoLayer({ id: layerId, name: "Clip", assetId });
    expect(layer.type).toBe("Video");
    expect(layer.playbackRate).toBe(1);
    expect(layer.parentId).toBeNull();
    expect(layer.transform).toEqual({
      x: 0,
      y: 0,
      scaleX: 1,
      scaleY: 1,
      rotation: 0,
      anchorX: 0,
      anchorY: 0,
    });
    expect(layer.opacity).toBe(1);
    expect(layer.visible).toBe(true);
    expect(layer.locked).toBe(false);
  });

  it("createImageLayer defaults fitMode to contain", () => {
    const layer = createImageLayer({ id: layerId, name: "Photo", assetId });
    expect(layer.fitMode).toBe("contain");
  });

  it("createAudioLayer defaults volume to 1", () => {
    const layer = createAudioLayer({ id: layerId, name: "VO", assetId });
    expect(layer.volume).toBe(1);
  });

  it("createTextLayer applies typography defaults and keeps given content", () => {
    const layer = createTextLayer({ id: layerId, name: "Title", content: "Hello" });
    expect(layer.content).toBe("Hello");
    expect(layer.fontFamily).toBe("Inter");
    expect(layer.fontSize).toBe(48);
    expect(layer.color).toBe("#FFFFFF");
    expect(layer.textAlign).toBe("left");
  });

  it("createStickerLayer requires only an asset", () => {
    const layer = createStickerLayer({ id: layerId, name: "Sticker", assetId });
    expect(layer.type).toBe("Sticker");
    expect(layer.assetId).toBe(assetId);
  });

  it("createShapeLayer defaults to a rectangle with no stroke", () => {
    const layer = createShapeLayer({ id: layerId, name: "Box" });
    expect(layer.shape).toBe("rectangle");
    expect(layer.fillColor).toBe("#FFFFFF");
    expect(layer.strokeColor).toBe("transparent");
    expect(layer.strokeWidth).toBe(0);
    expect(layer.cornerRadius).toBe(0);
  });

  it("createGroupLayer defaults to no children", () => {
    const layer = createGroupLayer({ id: layerId, name: "Group" });
    expect(layer.childIds).toEqual([]);
  });

  it("honors explicit overrides over defaults", () => {
    const layer = createVideoLayer({
      id: layerId,
      name: "Clip",
      assetId,
      opacity: 0.5,
      visible: false,
      locked: true,
      transform: { x: 10 },
      playbackRate: 2,
    });
    expect(layer.opacity).toBe(0.5);
    expect(layer.visible).toBe(false);
    expect(layer.locked).toBe(true);
    expect(layer.transform.x).toBe(10);
    expect(layer.transform.y).toBe(0);
    expect(layer.playbackRate).toBe(2);
  });
});
