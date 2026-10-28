import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../src/app.js';
import { prisma } from '../src/lib/database.js';
import { generateToken } from '../src/lib/auth.js';
import { runSeed } from '../prisma/seed.js';

const hasDb = process.env.TEST_DB_ENABLED === '1';

if (!hasDb) {
  console.warn('[server tests] TEST_DATABASE_URL is not set: skipping DB integration tests (ingredient search).');
}

afterAll(async () => {
  await prisma.$disconnect();
});

const tag = Array.from({ length: 8 }, () => String.fromCharCode(97 + Math.floor(Math.random() * 26))).join('');
const SECRET = `my secret thing ${tag}`;
const PUBLIC_ONLY = `zorbfruit ${tag}`;

describe.skipIf(!hasDb)('GET /api/ingredients?search= privacy (needs a migrated TEST_DATABASE_URL)', () => {
  let owner: [string, string];
  let other: [string, string];

  const names = (res: request.Response) => res.body.data.ingredients.map((i: any) => i.name.toLowerCase());

  beforeAll(async () => {
    await runSeed(prisma, { log: () => {} });
    const mk = async (email: string) => {
      const u = await prisma.user.upsert({ where: { email }, update: {}, create: { email, password: 'x' } });
      return { u, header: ['Authorization', `Bearer ${generateToken({ userId: u.id, email })}`] as [string, string] };
    };
    const a = await mk('search-owner@amugonna.test');
    const b = await mk('search-other@amugonna.test');
    owner = a.header;
    other = b.header;
    const secret = await prisma.ingredient.upsert({
      where: { canonical: SECRET },
      update: {},
      create: { name: SECRET, canonical: SECRET },
    });
    await prisma.userIngredient.upsert({
      where: { userId_ingredientId: { userId: a.u.id, ingredientId: secret.id } },
      update: {},
      create: { userId: a.u.id, ingredientId: secret.id },
    });
    // used by a public recipe -> visible to everyone
    const pub = await prisma.ingredient.upsert({
      where: { canonical: PUBLIC_ONLY },
      update: {},
      create: { name: PUBLIC_ONLY, canonical: PUBLIC_ONLY },
    });
    const recipe = await prisma.recipe.create({
      data: { title: `pub ${tag}`, instructions: 'x', servings: 1, isPublic: true, createdBy: b.u.id },
    });
    await prisma.recipeIngredient.create({ data: { recipeId: recipe.id, ingredientId: pub.id } });
  }, 120_000);

  it('hides another user\'s private ingredient from anonymous callers', async () => {
    const res = await request(app).get('/api/ingredients').query({ search: 'my secret thing' }).expect(200);
    expect(names(res)).not.toContain(SECRET);
  });

  it('hides it from a different logged-in user', async () => {
    const res = await request(app).get('/api/ingredients').query({ search: 'my secret thing' }).set(...other).expect(200);
    expect(names(res)).not.toContain(SECRET);
  });

  it('returns it to the user who has it in their pantry', async () => {
    const res = await request(app).get('/api/ingredients').query({ search: 'my secret thing' }).set(...owner).expect(200);
    expect(names(res)).toContain(SECRET);
  });

  it('an invalid token behaves like anonymous', async () => {
    const res = await request(app)
      .get('/api/ingredients')
      .query({ search: 'my secret thing' })
      .set('Authorization', 'Bearer nope')
      .expect(200);
    expect(names(res)).not.toContain(SECRET);
  });

  it('still returns vocabulary and public-recipe ingredients anonymously', async () => {
    const vocab = await request(app).get('/api/ingredients').query({ search: 'tomato' }).expect(200);
    expect(names(vocab)).toContain('tomato');
    const pub = await request(app).get('/api/ingredients').query({ search: 'zorbfruit' }).expect(200);
    expect(names(pub)).toContain(PUBLIC_ONLY);
  });

  it('treats LIKE wildcards literally', async () => {
    const res = await request(app).get('/api/ingredients').query({ search: '%' }).set(...owner).expect(200);
    expect(res.body.data.ingredients).toEqual([]);
    const res2 = await request(app).get('/api/ingredients').query({ search: 'my_secret' }).set(...owner).expect(200);
    expect(names(res2)).not.toContain(SECRET);
  });

  it('clamps limit to 1-50 and survives non-numeric limit', async () => {
    const bad = await request(app).get('/api/ingredients?search=a&limit=abc').expect(200);
    expect(bad.body.data.ingredients.length).toBeLessThanOrEqual(20);
    const big = await request(app).get('/api/ingredients?search=a&limit=5000').expect(200);
    expect(big.body.data.ingredients.length).toBeLessThanOrEqual(50);
    const zero = await request(app).get('/api/ingredients?search=a&limit=0').expect(200);
    expect(zero.body.data.ingredients.length).toBe(1);
    const neg = await request(app).get('/api/ingredients?search=a&limit=-3').expect(200);
    expect(neg.body.data.ingredients.length).toBe(1);
  });

  it('with no search term, still never lists private ingredients', async () => {
    const res = await request(app).get('/api/ingredients?limit=50').set(...other).expect(200);
    expect(names(res)).not.toContain(SECRET);
  });
});
