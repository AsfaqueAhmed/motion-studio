import { describe, expect, it } from "vitest";
import { EffectsEngine } from "./effects-engine";

describe("EffectsEngine", () => {
  it("follows the standard IEngine lifecycle without throwing", async () => {
    const engine = new EffectsEngine();
    expect(engine.name).toBe("Effects");
    await engine.initialize();
    await engine.ready();
    await engine.dispose();
  });
});
