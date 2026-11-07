import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync } from 'node:fs';
import { parse } from 'dotenv';
import { userInfo } from 'node:os';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
process.chdir(root);
const directory = `${root}.local/postgres`;
const port = '55439';
const environmentFile = `${root}server/.env`;
const signingSecret = process.env.JWT_SECRET || (existsSync(environmentFile) ? parse(readFileSync(environmentFile)).JWT_SECRET : '');
if (!signingSecret) throw new Error('Set JWT_SECRET in your environment or server/.env before starting the local app.');

function run(command, args, options = {}) {
  const result = spawnSync(command, args, { stdio: 'inherit', ...options });
  if (result.error || result.status !== 0) throw new Error(`${command} failed; check output above.`);
}

mkdirSync(`${root}.local`, { recursive: true });
if (!existsSync(`${directory}/PG_VERSION`)) run('initdb', ['-D', directory, '-A', 'trust', '--no-locale', '-E', 'UTF8']);
const running = spawnSync('pg_ctl', ['-D', directory, 'status'], { stdio: 'ignore' });
if (running.status !== 0) run('pg_ctl', ['-D', directory, '-l', `${root}.local/postgres.log`, '-o', `-p ${port} -h 127.0.0.1 -k /private/tmp`, 'start']);

const connection = ['-h', '127.0.0.1', '-p', port];
const database = spawnSync('psql', [...connection, '-d', 'postgres', '-tAc', "SELECT 1 FROM pg_database WHERE datname = 'amugonna_local'"], { encoding: 'utf8' });
if (database.status !== 0) throw new Error('Could not inspect local database.');
if (database.stdout.trim() !== '1') run('createdb', [...connection, 'amugonna_local']);

const url = `postgresql://${encodeURIComponent(userInfo().username)}@127.0.0.1:${port}/amugonna_local`;
const env = { ...process.env, DATABASE_URL: url, DIRECT_URL: url, JWT_SECRET: signingSecret, NODE_ENV: 'production' };
run('npx', ['prisma', 'migrate', 'deploy'], { cwd: `${root}server`, env });
run('npm', ['run', 'seed', '-w', 'server'], { env });
console.log('Local pantry database ready. Open the Vite URL below. Account, pantry, exclusions and sessions persist across restarts.');
run('npm', ['run', 'dev'], { env: { ...env, NODE_ENV: 'development', PORT: '3001', VITE_API_URL: 'http://localhost:3001/api' } });
