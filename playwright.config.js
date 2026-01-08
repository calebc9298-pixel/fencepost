// @ts-check
const path = require('path');
const { defineConfig } = require('@playwright/test');

const E2E_FAST = String(process.env.E2E_FAST || '').toLowerCase();
const isFastMode =
  E2E_FAST === '1' || E2E_FAST === 'true' || E2E_FAST === 'yes';
const workers = process.env.E2E_WORKERS
  ? Number.parseInt(process.env.E2E_WORKERS, 10)
  : isFastMode
    ? 2
    : undefined;

// Load local env files (kept out of git via .gitignore)
try {
  // eslint-disable-next-line import/no-extraneous-dependencies
  require('dotenv').config({ path: path.resolve(__dirname, '.env') });
  // eslint-disable-next-line import/no-extraneous-dependencies
  // For E2E runs, prefer the local .env.e2e values over any existing process env vars.
  require('dotenv').config({
    path: path.resolve(__dirname, '.env.e2e'),
    override: true,
  });
} catch {
  // dotenv isn't required for running tests without env files
}

module.exports = defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  expect: { timeout: 10_000 },
  globalSetup: require.resolve('./e2e/global-setup'),
  ...(workers ? { workers } : {}),
  use: {
    baseURL: process.env.E2E_BASE_URL || 'https://fencepost.net',
    headless: true,
    video: 'off',
    screenshot: 'only-on-failure',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { browserName: 'chromium' },
    },
  ],
});
