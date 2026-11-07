import { describe, it, expect } from 'vitest';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));

describe('server startup', () => {
  it('refuses to start without JWT_SECRET', () => {
    const env = { ...process.env, PORT: '0', DOTENV_CONFIG_PATH: '/nonexistent/.env' } as NodeJS.ProcessEnv;
    env.JWT_SECRET = ''; // Prevent dotenv filling a missing key from the developer's .env.
    const res = spawnSync('npx', ['tsx', 'src/index.ts'], { cwd: root, env, encoding: 'utf8', timeout: 30_000 });
    expect(res.status).toBe(1);
    expect(res.stderr).toContain('JWT_SECRET');
  }, 40_000);
});
