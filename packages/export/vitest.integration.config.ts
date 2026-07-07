import { defineConfig } from "vitest/config";

/**
 * PLAN.md 16.2 "Export pipeline (Spike A validated path only)" — real
 * Chromium via Playwright, not Node, so `VideoEncoder`/`AudioEncoder`/
 * Mediabunny actually run against the browser's real WebCodecs
 * implementation. `ExportEngine` itself has no real Mediabunny backend
 * wired yet (see `container.ts`'s doc comment) — this test exercises the
 * same Mediabunny + WebCodecs pipeline `spikes/spike-a-export/` proved,
 * now as a permanent, CI-tracked regression test instead of throwaway
 * spike code. Only `*.integration.test.ts` files run here.
 */
export default defineConfig({
  test: {
    include: ["src/**/*.integration.test.ts"],
    browser: {
      enabled: true,
      provider: "playwright",
      name: "chromium",
      headless: true,
    },
  },
});
