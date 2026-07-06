import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./apps/studio/e2e",
  fullyParallel: true,
  reporter: "html",
  use: {
    trace: "on-first-retry",
  },
  webServer: {
    command: "pnpm --filter @motion-studio/studio dev",
    url: "http://localhost:3000",
    reuseExistingServer: true,
  },
});
