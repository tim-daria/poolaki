import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  fullyParallel: true,
  // Prevents accidentally committing test.only which would skip all other tests
  forbidOnly: !!process.env.CI,
  // Retries only in CI — locally you want failures to be immediate
  retries: process.env.CI ? 2 : 0,
  // Single worker in CI to avoid port conflicts between parallel tests
  workers: process.env.CI ? 1 : undefined,
  // 'html' generates the report you'll upload as a CI artifact
  // 'list' prints results inline in the terminal (useful locally and in CI logs)
  reporter: process.env.CI ? [["html"], ["list"]] : "list",
  use: {
    // Local dev uses Caddy (https), CI uses Vite directly (http) — no TLS issues
    baseURL: process.env.BASE_URL ?? "http://poolaki.localhost:8080",
    // Keeps the Caddy TLS cert from blocking local runs
    ignoreHTTPSErrors: true,
    // Records a trace on the first retry so you can inspect failing tests
    trace: "on-first-retry",
    // Screenshots on failure — visible in the HTML report
    screenshot: "only-on-failure",
  },

  // Only test with Chromium — Firefox and WebKit can be added later.
  // In CI you're already installing only Chromium, so this must match.
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],

  // Uncomment this if you want Playwright to start Vite for you locally
  // instead of running it manually before tests. Leave commented for CI
  // since docker compose handles startup there.
  // webServer: {
  //   command: 'npm run dev',
  //   url: 'https://poolaki.localhost',
  //   reuseExistingServer: true,
  //   ignoreHTTPSErrors: true,
  // },
});
