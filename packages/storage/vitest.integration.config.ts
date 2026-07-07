import { defineConfig } from "vitest/config";

/**
 * Separate tier from vitest.config.ts (PLAN.md 16.2): runs in a real
 * Chromium via Playwright instead of Node, so `IndexedDBAdapter`/
 * `OpfsAdapter` exercise the browser's actual IndexedDB/OPFS implementation
 * instead of `fake-indexeddb`/the hand-rolled fake OPFS root used by the
 * unit tier. Only `*.integration.test.ts` files run here.
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
