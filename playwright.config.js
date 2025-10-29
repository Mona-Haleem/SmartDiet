import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./static/__tests__/e2e",
  testMatch: ["**/*.e2e.spec.js", "**/*.spec.js"],

  // Run tests in files in parallel
  fullyParallel: true,

  // Fail the build on CI if you accidentally left test.only
  forbidOnly: !!process.env.CI,

  // Retry on CI only
  retries: process.env.CI ? 2 : 0,

  // Opt out of parallel tests on CI
  workers: process.env.CI ? 1 : undefined,

  // Reporter to use
  reporter: "html",

  use: {
    // Base URL for your Django dev server
    baseURL: "http://127.0.0.1:8000",

    // Collect trace when retrying the failed test
    trace: "on-first-retry",

    // Screenshot on failure
    screenshot: "only-on-failure",
  },

  // Configure projects for major browsers
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
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
    command: "python manage.py runserver",
    url: "http://127.0.0.1:8000/diet/",
    reuseExistingServer: !process.env.CI,
    timeout: 180 * 1000,
  },
});
