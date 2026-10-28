import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../src/app.js';
import { prisma } from '../src/lib/database.js';
import { generateToken } from '../src/lib/auth.js';
import { runSeed } from '../prisma/seed.js';
import { parsePantryText } from '../src/lib/pantry/index.js';

const hasDb = Boolean(process.env.DATABASE_URL);

if (!hasDb) {
  console.warn('[server tests] DATABASE_URL is not set: skipping DB integration tests (pantry API).');
}

afterAll(async () => {
  await prisma.$disconnect();
});

describe('parsePantryText (no DB)', () => {
  it('splits on commas, semicolons, newlines and "and"; keeps staple pairs whole', () => {
    expect(parsePantryText('eggs; milk\nflour and sugar').map((i) => i.canonical)).toEqual(['egg', 'milk', 'flour', 'sugar']);
    expect(parsePantryText('salt and pepper').map((i) => i.canonical)).toEqual(['salt']);
  });
});

describe.skipIf(!hasDb)('pantry entry API (needs a migrated DATABASE_URL)', () => {
  let auth: [string, string];
  let userId: number;
  const idOf = async (canonical: string) => (await prisma.ingredient.findUniqueOrThrow({ where: { canonical } })).id;

  beforeAll(async () => {
    await runSeed(prisma, { log: () => {} });
    const user = await prisma.user.upsert({
      where: { email: 'pantry-test@amugonna.test' },
      update: {},
      create: { email: 'pantry-test@amugonna.test', password: 'x' },
    });
    userId = user.id;
    auth = ['Authorization', `Bearer ${generateToken({ userId, email: user.email })}`];
    await prisma.userIngredient.deleteMany({ where: { userId } });
    const stale = await prisma.ingredient.findUnique({ where: { canonical: 'yuzu kosho' } });
    if (stale) {
      await prisma.userIngredient.deleteMany({ where: { ingredientId: stale.id } });
      await prisma.ingredient.delete({ where: { id: stale.id } });
    }
  }, 120_000);

  it('GET /common returns groups and exactly 4 staples', async () => {
    const res = await request(app).get('/api/ingredients/common').expect(200);
    const { groups, staples } = res.body.data;
    expect(res.body.success).toBe(true);
    expect(groups.length).toBeGreaterThan(3);
    expect(groups[0].category).toBe('Produce');
    expect(groups[0].items[0]).toEqual({ id: expect.any(Number), name: expect.any(String), canonical: expect.any(String) });
    expect(staples.map((s: any) => s.canonical).sort()).toEqual(['black pepper', 'cooking oil', 'salt', 'water']);
  });

  it('GET /suggest ranks typos and synonyms, and empty q gives []', async () => {
    const a = await request(app).get('/api/ingredients/suggest?q=tomatoe').expect(200);
    expect(a.body.data.items[0]).toMatchObject({ name: 'Tomato', canonical: 'tomato', id: expect.any(Number) });
    const b = await request(app).get('/api/ingredients/suggest?q=scal').expect(200);
    expect(b.body.data.items[0].name).toBe('Green Onion');
    const c = await request(app).get('/api/ingredients/suggest?q=').expect(200);
    expect(c.body.data.items).toEqual([]);
    const d = await request(app).get('/api/ingredients/suggest?q=a&limit=500').expect(200);
    expect(d.body.data.items.length).toBeLessThanOrEqual(20);
  });

  it('requires auth on user routes', async () => {
    await request(app).post('/api/ingredients/user/bulk').send({ add: [1] }).expect(401);
    await request(app).post('/api/ingredients/user/parse').send({ text: 'egg' }).expect(401);
  });

  it('bulk add: ids + free text, idempotent, remove works', async () => {
    const tomatoId = await idOf('tomato');
    const body = { add: [tomatoId, 'scallions', 'yuzu kosho'] };
    const first = await request(app).post('/api/ingredients/user/bulk').set(...auth).send(body).expect(200);
    expect(first.body.data.ingredients).toHaveLength(3);
    expect(first.body.data.ingredients[0].ingredient.canonical).toEqual(expect.any(String));
    const resolved = first.body.data.resolved;
    expect(resolved).toHaveLength(2);
    expect(resolved[0]).toMatchObject({ input: 'scallions', created: false, ingredient: { canonical: 'green onion', name: 'Green Onion' } });
    expect(resolved[1]).toMatchObject({ input: 'yuzu kosho', created: true, ingredient: { canonical: 'yuzu kosho', name: 'Yuzu Kosho' } });

    const again = await request(app).post('/api/ingredients/user/bulk').set(...auth).send(body).expect(200);
    expect(again.body.data.ingredients).toHaveLength(3);
    expect(again.body.data.resolved[1].created).toBe(false);
    expect(await prisma.userIngredient.count({ where: { userId } })).toBe(3);

    const get = await request(app).get('/api/ingredients/user').set(...auth).expect(200);
    expect(get.body.data.ingredients).toHaveLength(3);
    expect(get.body.data.ingredients[0].ingredient.canonical).toEqual(expect.any(String));
    expect(get.body.data.ingredients[0]).toMatchObject({ id: expect.any(Number), addedAt: expect.any(String) });

    const sug = await request(app).get('/api/ingredients/suggest?q=yuzu').expect(200);
    expect(sug.body.data.items.map((i: any) => i.canonical)).toContain('yuzu kosho');

    const rem = await request(app).post('/api/ingredients/user/bulk').set(...auth).send({ remove: [tomatoId, 999999] }).expect(200);
    expect(rem.body.data.ingredients.map((i: any) => i.ingredient.canonical).sort()).toEqual(['green onion', 'yuzu kosho']);
  });

  it('bulk rejects bad bodies with 400', async () => {
    const post = (b: unknown) => request(app).post('/api/ingredients/user/bulk').set(...auth).send(b as any);
    expect((await post({ add: 'egg' }).expect(400)).body.message).toMatch(/array/);
    await post({ add: [{}] }).expect(400);
    await post({ add: [''] }).expect(400);
    await post({ add: ['   '] }).expect(400);
    await post({ add: ['x'.repeat(81)] }).expect(400);
    await post({ add: Array.from({ length: 101 }, () => 'egg') }).expect(400);
    await post({ remove: ['egg'] }).expect(400);
    expect((await post({ add: [999999] }).expect(400)).body.message).toMatch(/not found/);
    await post([1]).expect(400);
  });

  it('bulk is atomic: a bad id rolls back text-created ingredients', async () => {
    await request(app).post('/api/ingredients/user/bulk').set(...auth).send({ add: ['dragonfruit sprinkles', 999999] }).expect(400);
    expect(await prisma.ingredient.count({ where: { canonical: 'dragonfruit sprinkles' } })).toBe(0);
  });

  it('parse splits and resolves without writing', async () => {
    const before = await prisma.ingredient.count();
    const res = await request(app).post('/api/ingredients/user/parse').set(...auth).send({ text: 'eggs, 2 scallions, tomatoe' }).expect(200);
    expect(res.body.data.items.map((i: any) => [i.canonical, i.known])).toEqual([['egg', true], ['green onion', true], ['tomato', true]]);
    expect(res.body.data.items[0]).toMatchObject({ input: 'eggs', name: 'Eggs', ingredientId: expect.any(Number) });
    const staple = await request(app).post('/api/ingredients/user/parse').set(...auth).send({ text: 'salt and pepper' }).expect(200);
    expect(staple.body.data.items).toHaveLength(1);
    expect(staple.body.data.items[0]).toMatchObject({ canonical: 'salt', known: true });
    const unk = await request(app).post('/api/ingredients/user/parse').set(...auth).send({ text: 'zorblax root' }).expect(200);
    expect(unk.body.data.items[0]).toMatchObject({ canonical: 'zorblax root', known: false, ingredientId: null });
    expect(await prisma.ingredient.count()).toBe(before);
    await request(app).post('/api/ingredients/user/parse').set(...auth).send({ text: 'x'.repeat(1001) }).expect(400);
    await request(app).post('/api/ingredients/user/parse').set(...auth).send({}).expect(400);
  });
});
