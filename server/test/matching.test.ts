import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../src/app.js';
import { prisma } from '../src/lib/database.js';
import { runSeed } from '../prisma/seed.js';
import { invalidateRecipeIndex } from '../src/lib/matching/index.js';
// type-only import of the contract the client consumes (erased at runtime)
import type { CookRecipe, RecipeMatch, Suggestions } from '../../client/src/types/cook.js';

const hasDb = Boolean(process.env.DATABASE_URL);

if (!hasDb) {
  console.warn(
    '[server tests] DATABASE_URL is not set: skipping DB integration tests (matching). ' +
      'Set DATABASE_URL (and run `npx prisma migrate deploy`) to run them.'
  );
}

afterAll(async () => {
  await prisma.$disconnect();
});

// The brief's eight items give 0 cookNow on the seed data (every egg/cheese dish wants butter), so butter is added.
const PANTRY = ['egg', 'butter', 'rice', 'onion', 'garlic', 'chicken breast', 'pasta', 'chopped tomato', 'cheddar'];

function expectMatchShape(m: RecipeMatch) {
  expect(Object.keys(m).sort()).toEqual(
    ['area', 'category', 'id', 'imageUrl', 'ingredientCount', 'missing', 'swaps', 'title', 'totalTime', 'usedCount'].sort()
  );
  expect(typeof m.id).toBe('number');
  expect(typeof m.title).toBe('string');
  expect(m.imageUrl === null || typeof m.imageUrl === 'string').toBe(true);
  expect(m.category === null || typeof m.category === 'string').toBe(true);
  expect(m.area === null || typeof m.area === 'string').toBe(true);
  expect(m.totalTime === null || typeof m.totalTime === 'number').toBe(true);
  expect(m.ingredientCount).toBeGreaterThan(0);
  expect(m.usedCount).toBeLessThanOrEqual(m.ingredientCount);
  for (const x of m.missing) expect(Object.keys(x).sort()).toEqual(['canonical', 'name']);
  for (const x of m.swaps) expect(Object.keys(x).sort()).toEqual(['need', 'using']);
}

describe.skipIf(!hasDb)('matching API (needs a migrated DATABASE_URL)', () => {
  let token: string;
  let userId: number;
  const auth = () => ({ Authorization: `Bearer ${token}` });

  beforeAll(async () => {
    await runSeed(prisma, { log: () => {} });
    invalidateRecipeIndex();

    const email = `match-${Date.now()}@example.com`;
    const reg = await request(app)
      .post('/api/auth/register')
      .send({ email, password: 'Passw0rd!x', firstName: 'Match', lastName: 'Tester' });
    expect(reg.status).toBe(201);
    token = reg.body.data.token;
    userId = (await prisma.user.findUniqueOrThrow({ where: { email } })).id;

    const rows = await prisma.ingredient.findMany({ where: { canonical: { in: PANTRY } }, select: { id: true, canonical: true } });
    expect(rows.map((r) => r.canonical).sort()).toEqual([...PANTRY].sort());
    for (const r of rows) {
      const res = await request(app).post('/api/ingredients/user').set(auth()).send({ ingredientId: r.id });
      expect(res.status).toBe(201);
    }
  }, 120_000);

  it('GET /recipes/suggestions returns the contract shape with at least one cookNow', async () => {
    const t0 = performance.now();
    const res = await request(app).get('/api/recipes/suggestions').set(auth());
    const ms = performance.now() - t0;
    console.log(`GET /api/recipes/suggestions took ${ms.toFixed(0)} ms (cold index)`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    const data = res.body.data as Suggestions;
    expect(Object.keys(data).sort()).toEqual(['cookNow', 'oneAway', 'pantrySize', 'totalRecipes', 'twoAway']);
    expect(data.pantrySize).toBe(PANTRY.length);
    expect(data.totalRecipes).toBeGreaterThanOrEqual(45);
    expect(data.cookNow.length).toBeGreaterThanOrEqual(1);
    for (const m of data.cookNow) {
      expectMatchShape(m);
      expect(m.missing).toEqual([]);
    }
    for (const m of data.oneAway) {
      expectMatchShape(m);
      expect(m.missing).toHaveLength(1);
    }
    for (const m of data.twoAway) {
      expectMatchShape(m);
      expect(m.missing).toHaveLength(2);
    }
    console.log(
      `suggestions: cookNow=${data.cookNow.length} oneAway=${data.oneAway.length} twoAway=${data.twoAway.length} of ${data.totalRecipes}; first cookNow="${data.cookNow[0].title}"`
    );
    expect(ms).toBeLessThan(300);

    const t1 = performance.now();
    const warm = await request(app).get('/api/recipes/suggestions').set(auth());
    const warmMs = performance.now() - t1;
    console.log(`GET /api/recipes/suggestions took ${warmMs.toFixed(0)} ms (warm index)`);
    expect(warm.status).toBe(200);
    expect(warmMs).toBeLessThan(300);
  });

  it('requires auth', async () => {
    expect((await request(app).get('/api/recipes/suggestions')).status).toBe(401);
  });

  it('GET /recipes/:id returns steps and ingredient statuses for a public recipe', async () => {
    const pub = await prisma.recipe.findFirstOrThrow({ where: { isPublic: true, externalSource: 'amugonna-seed' }, orderBy: { id: 'asc' } });
    const res = await request(app).get(`/api/recipes/${pub.id}`).set(auth());
    expect(res.status).toBe(200);
    const recipe = res.body.data.recipe as CookRecipe & { recipeIngredients: unknown[] };
    expect(recipe.id).toBe(pub.id);
    expect(recipe.steps.length).toBeGreaterThan(1);
    expect(recipe.ingredients.length).toBeGreaterThan(0);
    for (const i of recipe.ingredients) {
      expect(['have', 'swap', 'missing', 'staple']).toContain(i.status);
      expect(typeof i.name).toBe('string');
      expect(typeof i.canonical).toBe('string');
      expect(typeof i.optional).toBe('boolean');
      expect(i.measure === null || typeof i.measure === 'string').toBe(true);
      if (i.status === 'swap') expect(typeof i.using).toBe('string');
    }
    expect(recipe.isOwner).toBe(false);
    expect(recipe.isFavorite).toBe(false);
    for (const k of ['imageUrl', 'category', 'area', 'attribution', 'license', 'sourceName', 'sourceUrl', 'description', 'servings', 'prepTime', 'cookTime']) {
      expect(recipe).toHaveProperty(k);
    }
    // existing fields kept for the My recipes screens
    expect(Array.isArray(recipe.recipeIngredients)).toBe(true);
  });

  it('a cookNow recipe has no missing required ingredients in the detail view', async () => {
    const sug = (await request(app).get('/api/recipes/suggestions').set(auth())).body.data as Suggestions;
    const res = await request(app).get(`/api/recipes/${sug.cookNow[0].id}`).set(auth());
    const recipe = res.body.data.recipe as CookRecipe;
    expect(recipe.ingredients.filter((i) => i.status === 'missing' && !i.optional)).toEqual([]);
  });

  it("404s for an unknown id, a bad id and another user's private recipe; own private recipe is visible and invalidates the index", async () => {
    expect((await request(app).get('/api/recipes/999999999').set(auth())).status).toBe(404);
    expect((await request(app).get('/api/recipes/abc').set(auth())).status).toBe(404);

    const system = await prisma.user.findUniqueOrThrow({ where: { email: 'system@amugonna.internal' } });
    const priv = await prisma.recipe.create({
      data: { title: 'secret', instructions: 'Do it. Then eat it.', createdBy: system.id, isPublic: false },
    });
    try {
      expect((await request(app).get(`/api/recipes/${priv.id}`).set(auth())).status).toBe(404);
    } finally {
      await prisma.recipe.delete({ where: { id: priv.id } });
    }

    // own recipe via the API: appears in detail (isOwner) and in suggestions straight away
    const egg = await prisma.ingredient.findUniqueOrThrow({ where: { canonical: 'egg' } });
    const created = await request(app)
      .post('/api/recipes')
      .set(auth())
      .send({ title: 'My egg thing', instructions: 'Crack it. Cook it.', ingredients: [{ ingredientId: egg.id }] });
    expect(created.status).toBe(201);
    const id = created.body.data.recipe.id as number;
    try {
      const detail = await request(app).get(`/api/recipes/${id}`).set(auth());
      expect(detail.status).toBe(200);
      expect(detail.body.data.recipe.isOwner).toBe(true);
      const sug = (await request(app).get('/api/recipes/suggestions').set(auth())).body.data as Suggestions;
      expect(sug.cookNow.some((m) => m.id === id)).toBe(true);
      expect((await request(app).delete(`/api/recipes/${id}`).set(auth())).status).toBe(200);
      const after = (await request(app).get('/api/recipes/suggestions').set(auth())).body.data as Suggestions;
      expect(after.cookNow.some((m) => m.id === id)).toBe(false);
    } finally {
      await prisma.favoriteRecipe.deleteMany({ where: { recipeId: id } });
      await prisma.recipeIngredient.deleteMany({ where: { recipeId: id } });
      await prisma.recipe.deleteMany({ where: { id } });
    }
    void userId;
  });
});
