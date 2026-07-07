import { defineConfig } from "vitest/config";

/**
 * PLAN.md 16.2 — real Chromium via Playwright, not jsdom, so
 * `AssetBlobStore`/`AssetCatalogRepository` (backed by a real `StorageEngine`)
 * exercise the browser's actual OPFS/IndexedDB rather than a fake. Only
 * `*.integration.test.ts` files run here.
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
