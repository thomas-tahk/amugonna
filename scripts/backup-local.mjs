import { mkdirSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { userInfo } from 'node:os';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const directory = `${root}.local/backups`;
mkdirSync(directory, { recursive: true });
const file = `${directory}/amugonna-${new Date().toISOString().replace(/[:.]/g, '-')}.dump`;
const result = spawnSync('pg_dump', ['--format=custom', '--file', file], {
  env: { ...process.env, PGHOST: '127.0.0.1', PGPORT: '55439', PGUSER: userInfo().username, PGDATABASE: 'amugonna_local' },
  stdio: ['ignore', 'ignore', 'pipe'],
});
if (result.error || result.status !== 0) throw new Error('Local backup failed. Confirm local Postgres is running and pg_dump is installed.');
console.log(`Local backup saved: ${file}`);
