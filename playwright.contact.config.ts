import { defineConfig, devices } from '@playwright/test';

/**
 * Contact integration suite.
 *
 * Unlike `playwright.config.ts` (which previews the static build with Vite),
 * this config starts the build through `wrangler pages dev`, so `/api/contact`
 * is served by the real Pages Function and writes to the local D1 database.
 *
 * The local database is reset and migrated by `npm run test:contact` before
 * Playwright starts.
 */
const PORT = 4109;
const BASE_URL = `http://127.0.0.1:${PORT}`;

export default defineConfig({
  testDir: './tests',
  testMatch: '**/contact.spec.ts',
  timeout: 90_000,
  expect: { timeout: 20_000 },
  fullyParallel: false,
  workers: 1,
  forbidOnly: true,
  retries: 0,
  reporter: [['list']],
  use: {
    baseURL: BASE_URL,
    headless: true,
    channel: 'chrome',
    trace: 'off',
    screenshot: 'off',
    video: 'off',
  },
  projects: [
    {
      name: 'chrome',
      use: { ...devices['Desktop Chrome'], channel: 'chrome', headless: true },
    },
  ],
  webServer: {
    command: 'npm run pages:dev',
    url: BASE_URL,
    reuseExistingServer: false,
    timeout: 120_000,
    env: { WRANGLER_SEND_METRICS: 'false' },
    stdout: 'ignore',
    stderr: 'pipe',
  },
});