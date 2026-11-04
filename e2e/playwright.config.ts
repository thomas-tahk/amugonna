import { defineConfig, devices } from '@playwright/test';

/**
 * Runs against the BUILT app (no dev servers):
 *   server: node server/dist/index.js on :3201  (needs DATABASE_URL, DIRECT_URL, JWT_SECRET in the env,
 *           a migrated + seeded database)
 *   client: vite preview on :4201, built with VITE_API_URL=http://localhost:3201/api baked in
 * `npm run e2e` (root) builds both first. Built output is used so the test exercises what ships.
 */
export default defineConfig({
  testDir: '.',
  testMatch: /.*\.spec\.ts/,
  outputDir: '../test-results',
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: true,
  retries: process.env.CI ? 1 : 0,
  reporter: [['list'], ['html', { open: 'never', outputFolder: '../playwright-report' }]],
  use: {
    baseURL: 'http://localhost:4201',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'phone',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 390, height: 844 },
        isMobile: true,
        hasTouch: true,
        deviceScaleFactor: 2,
      },
    },
    {
      name: 'desktop',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 800 } },
    },
  ],
  webServer: [
    {
      command: 'node server/dist/index.js',
      cwd: '..',
      url: 'http://localhost:3201/health',
      env: { PORT: '3201', NODE_ENV: 'production' },
      reuseExistingServer: !process.env.CI,
      timeout: 60_000,
    },
    {
      command: 'npm run preview -w client -- --port 4201 --strictPort',
      cwd: '..',
      url: 'http://localhost:4201',
      reuseExistingServer: !process.env.CI,
      timeout: 60_000,
    },
  ],
});
