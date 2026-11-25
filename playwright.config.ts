import { defineConfig, devices } from "@playwright/test";
import path from "node:path";

export default defineConfig({
  testDir: "./tests/browser",
  fullyParallel: true,
  workers: process.env.CI ? 2 : undefined,
  retries: process.env.CI ? 1 : 0,
  reporter: "list",
  use: {
    baseURL: "http://127.0.0.1:4321/local-ai-tools/",
    trace: "retain-on-failure",
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile", use: { ...devices["Pixel 7"] } },
  ],
  webServer: {
    command:
      "pnpm --filter @local-ai-tools/web build && pnpm --filter @local-ai-tools/web exec astro preview --host 127.0.0.1 --port 4321 --ignore-lock",
    url: "http://127.0.0.1:4321/local-ai-tools/",
    reuseExistingServer: false,
    timeout: 120_000,
    env: {
      CATALOG_SNAPSHOT_DIR: path.resolve("tests/fixtures"),
      SITE_URL: "http://127.0.0.1:4321",
      SITE_BASE: "/local-ai-tools",
    },
  },
});
