import { describe, it, expect, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../src/app.js';
import { prisma } from '../src/lib/database.js';

const hasDb = Boolean(process.env.DATABASE_URL);

if (!hasDb) {
  console.warn(
    '[server tests] DATABASE_URL is not set: skipping DB integration tests (GET /health). ' +
      'Set DATABASE_URL (and run `npx prisma migrate deploy`) to run them.'
  );
}

afterAll(async () => {
  await prisma.$disconnect();
});

describe('app smoke', () => {
  it('GET /api/test responds without a database', async () => {
    const res = await request(app).get('/api/test');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ message: 'API is working' });
  });
});

describe.skipIf(!hasDb)('GET /health (needs DATABASE_URL)', () => {
  it('reports the database as connected', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('OK');
    expect(res.body.database).toBe('Connected');
  });
});
