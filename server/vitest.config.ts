import { defineConfig } from 'vitest/config';

// DB-backed tests run ONLY against TEST_DATABASE_URL, never the dev/prod DATABASE_URL
// (which dotenv would otherwise load from server/.env). Without it they are skipped.
const testDb = process.env.TEST_DATABASE_URL;

if (testDb) {
  let dbName = '';
  try {
    dbName = decodeURIComponent(new URL(testDb).pathname.replace(/^\//, ''));
  } catch {
    throw new Error('TEST_DATABASE_URL is not a valid URL');
  }
  if (!dbName.toLowerCase().includes('test')) {
    throw new Error(
      `Refusing to run tests: TEST_DATABASE_URL database name "${dbName}" must contain "test" (tests wipe and seed data).`
    );
  }
}

export default defineConfig({
  test: {
    // Defined-but-empty DATABASE_URL also stops dotenv from loading a real one from server/.env.
    env: {
      DATABASE_URL: testDb ?? '',
      DIRECT_URL: testDb ?? '',
      TEST_DB_ENABLED: testDb ? '1' : '0',
      JWT_SECRET: process.env.JWT_SECRET || 'vitest-secret',
    },
    environment: 'node',
    include: ['src/**/*.test.ts', 'test/**/*.test.ts'],
    exclude: ['node_modules', 'dist', 'e2e/**'],
    fileParallelism: false, // DB integration tests share one database
  },
});
