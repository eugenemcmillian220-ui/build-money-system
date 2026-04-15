import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  timeout: 30_000,
  retries: 1,
  use: {
    baseURL: process.env.TEST_BASE_URL || "http://localhost:3000",
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: { browserName: "chromium" },
    },
  ],
  // Don't start a dev server automatically — run against the deployed URL
  webServer: process.env.TEST_BASE_URL
    ? undefined
    : {
        command: "npm run dev",
        port: 3000,
        reuseExistingServer: true,
      },
});
