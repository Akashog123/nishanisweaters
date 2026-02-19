import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright Configuration for E2E Testing
 *
 * This configuration is optimized for testing the checkout flow
 * of the Nidhi Clothing Co. e-commerce platform.
 *
 * USAGE:
 * - Option 1: Start dev server manually in another terminal, then run tests
 *   Terminal 1: npm run dev:frontend
 *   Terminal 2: npm run test:e2e
 *
 * - Option 2: Let Playwright start the server (requires reuseExistingServer: false)
 *   npm run test:e2e
 *
 * NOTE: On Windows, if webServer fails to start, use Option 1.
 */
export default defineConfig({
  testDir: './e2e',

  /* Run tests in files in parallel */
  fullyParallel: true,

  /* Fail the build on CI if you accidentally left test.only in the source code */
  forbidOnly: !!process.env.CI,

  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,

  /* Increase workers on CI for faster execution */
  workers: process.env.CI ? 2 : undefined,

  /* Reporter to use */
  reporter: [
    ['html', { open: 'never' }],
    ['list'],
  ],

  /* Global timeout for each test */
  timeout: 30000,

  /* Expect timeout */
  expect: {
    timeout: 10000,
  },

  /* Shared settings for all the projects below */
  use: {
    /* Base URL for the application */
    baseURL: process.env.BASE_URL || 'http://localhost:5173',

    /* Collect trace when retrying the failed test */
    trace: 'on-first-retry',

    /* Take screenshot on failure */
    screenshot: 'only-on-failure',

    /* Record video on failure */
    video: 'on-first-retry',

    /* Slow down operations for debugging (set to 0 for normal speed) */
    // launchOptions: { slowMo: 100 },
  },

  /* Configure projects for major browsers */
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },

    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },

    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },

    /* Test against mobile viewports */
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
    },

    {
      name: 'Mobile Safari',
      use: { ...devices['iPhone 12'] },
    },
  ],

  /* Run your local dev server before starting the tests */
  webServer: {
    command: process.platform === 'win32'
      ? 'npx vite --port 5173'  // Direct vite command works better on Windows
      : 'npm run dev:frontend',
    url: process.env.BASE_URL || 'http://localhost:5173',
    reuseExistingServer: true,  // Always reuse if already running
    timeout: 120000,
    stdout: 'pipe',
    stderr: 'pipe',
  },
});
