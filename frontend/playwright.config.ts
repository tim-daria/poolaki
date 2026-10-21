import { defineConfig, devices } from "@playwright/test";

// Safari's engine stands in for Safari: real Safari needs macOS, and WebKit
// catches the engine-level differences (date inputs, dvh, print) where Safari
// diverges. It is opt-in: the stack serves plain HTTP and Django marks its
// cookies Secure; Chromium and Firefox exempt *.localhost from that rule,
// WebKit does not, so sign-in fails there until the dev stack has HTTPS. See
// docs/frontend/browser-support.md.
const browsers = [
  { name: "chromium", device: "Desktop Chrome" },
  { name: "firefox", device: "Desktop Firefox" },
  ...(process.env.E2E_WEBKIT
    ? [{ name: "webkit", device: "Desktop Safari" }]
    : []),
] as const;

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
    // Both local dev and CI go through Caddy on plain HTTP, so the WAF in
    // front of the app is exercised rather than bypassed.
    baseURL: process.env.BASE_URL ?? "http://poolaki.localhost:8080",
    // Keeps the Caddy TLS cert from blocking local runs
    ignoreHTTPSErrors: true,
    // Dates are asserted as literals; the runner's zone must not shift them.
    timezoneId: "Europe/Berlin",
    // Records a trace on the first retry so you can inspect failing tests
    trace: "on-first-retry",
    // Screenshots on failure — visible in the HTML report
    screenshot: "only-on-failure",
  },

  // All three engines run; CI and docs/frontend/playwright.md install all
  // three (`npx playwright install` with no browser list).
  // Each engine gets its own setup project, which runs first, also for a
  // single spec: it registers the shared owner that engine's specs sign in
  // as (see "Shared owner" in tests/helpers.ts). One owner per engine keeps
  // every project under the backend's 10-workspaces-per-user cap.
  projects: [
    ...browsers.flatMap(({ name, device }) => [
      {
        name: `setup-${name}`,
        testMatch: /\.setup\.ts$/,
        use: { ...devices[device] },
      },
      {
        name,
        use: { ...devices[device] },
        dependencies: [`setup-${name}`],
      },
    ]),
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
