import { defineConfig } from 'vitest/config';

// Never let tests silently hit the dev DB: TEST_DATABASE_URL wins when set.
const testDb = process.env.TEST_DATABASE_URL;

export default defineConfig({
  test: {
    env: testDb ? { DATABASE_URL: testDb, DIRECT_URL: testDb } : {},
    environment: 'node',
    include: ['src/**/*.test.ts', 'test/**/*.test.ts'],
    exclude: ['node_modules', 'dist', 'e2e/**'],
    fileParallelism: false, // DB integration tests share one database
  },
});
