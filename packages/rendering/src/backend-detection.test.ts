import { RenderBackend } from "@motion-studio/shared";
import { describe, expect, it } from "vitest";
import {
  defaultCapabilityProbe,
  selectBackend,
  type IBackendCapabilityProbe,
} from "./backend-detection";

function probe(overrides: Partial<IBackendCapabilityProbe>): IBackendCapabilityProbe {
  return {
    hasWebGPU: () => false,
    hasWebGL2: () => false,
    hasCanvas2D: () => false,
    ...overrides,
  };
}

describe("selectBackend", () => {
  it("prefers WebGPU when available", () => {
    expect(
      selectBackend(
        probe({ hasWebGPU: () => true, hasWebGL2: () => true, hasCanvas2D: () => true }),
      ),
    ).toBe(RenderBackend.WebGPU);
  });

  it("falls back to WebGL2 when WebGPU is unavailable", () => {
    expect(selectBackend(probe({ hasWebGL2: () => true, hasCanvas2D: () => true }))).toBe(
      RenderBackend.WebGL2,
    );
  });

  it("falls back to Canvas2D when only that is available", () => {
    expect(selectBackend(probe({ hasCanvas2D: () => true }))).toBe(RenderBackend.Canvas2D);
  });

  it("falls back to Software when nothing is available (headless/CI)", () => {
    expect(selectBackend(probe({}))).toBe(RenderBackend.Software);
  });

  it("defaultCapabilityProbe reports nothing in this Node test environment", () => {
    expect(selectBackend(defaultCapabilityProbe)).toBe(RenderBackend.Software);
  });
});
