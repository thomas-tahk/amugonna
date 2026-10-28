import base from '../playwright.config';
import { defineConfig } from '@playwright/test';

// Exploratory break-it scripts. Not part of CI:
//   npx playwright test -c e2e/explore/playwright.explore.config.ts
export default defineConfig({
  ...base,
  testDir: '.',
  testMatch: /.*\.explore\.ts/,
  outputDir: '../../test-results-explore',
  reporter: [['list']],
  webServer: (base.webServer as { cwd?: string }[]).map((w) => ({ ...w, cwd: '../..' })) as never,
});
