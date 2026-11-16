import { defineConfig, devices } from "@playwright/test";
const port = Number(process.env.SMARTDIET_E2E_PORT || 8765);
export default defineConfig({
  testDir: "./static/__tests__/e2e",
  testMatch: "**/*.spec.js",

  // A dedicated seeded SQLite database is shared by serial browser journeys.
  fullyParallel: false,

  // Fail the build on CI if you accidentally left test.only
  forbidOnly: !!process.env.CI,

  // Retry on CI only
  retries: process.env.CI ? 2 : 0,

  // Opt out of parallel tests on CI
  workers: 1,

  // Reporter to use
  reporter: process.argv.includes("--list")
    ? "list"
    : [["list"], ["html", { outputFolder: "coverage/playwright-report", open: "never" }], ["json", { outputFile: "test-results/results.json" }]],
  timeout: 30000,
  expect: { timeout: 5000 },

  use: {
    // Base URL for your Django dev server
    baseURL: `http://127.0.0.1:${port}`,
    timezoneId: "Africa/Cairo",

    // Collect trace when retrying the failed test
    trace: "retain-on-failure",

    // Screenshot on failure
    screenshot: "only-on-failure",
  },

  // Configure projects for major browsers
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 1000 } },
    },
    {
      name: "mobile-chromium",
      use: { ...devices["Pixel 7"] },
    },
    {
      name: "firefox",
      use: {
        ...devices["Desktop Firefox"],
        launchOptions: { args: ["--no-remote"] },
      },
    },
    {
      name: "webkit",
      use: { ...devices["Desktop Safari"] },
    },
  ],

  // Run your local dev server before starting the tests
  webServer: {
    command: 'python scripts/run_e2e_server.py',
    url: `http://127.0.0.1:${port}/diet/`,
    reuseExistingServer: false,
    timeout: 180 * 1000,
    stdout: "ignore",
    stderr: "pipe",
    // Set the env var for the server process
    env: {
      DJANGO_SETTINGS_MODULE: "config.e2e_settings",
      DATABASE_URL: "",
      SMARTDIET_E2E_PORT: String(port),
      PYTHONUTF8: "1",
    },
  },
});
