import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../src/app.js';
import { prisma } from '../src/lib/database.js';
import { generateToken } from '../src/lib/auth.js';
import { runSeed } from '../prisma/seed.js';
import { invalidateRecipeIndex } from '../src/lib/matching/index.js';

afterAll(() => prisma.$disconnect());

describe.skipIf(process.env.TEST_DB_ENABLED !== '1')('saved exclusions', () => {
  let authorization: string;
  let otherAuthorization: string;
  let optionalMilkRecipe: number;
  let rawMilkRecipe: number;

  beforeAll(async () => {
    await runSeed(prisma, { log: () => {} });
    const email = `exclusions-${Date.now()}@amugonna.test`;
    const user = await prisma.user.create({ data: { email, password: 'test-only' } });
    const other = await prisma.user.create({ data: { email: `other-${email}`, password: 'test-only' } });
    authorization = `Bearer ${generateToken({ userId: user.id, email })}`;
    otherAuthorization = `Bearer ${generateToken({ userId: other.id, email: other.email })}`;
    const ids = await prisma.ingredient.findMany({ where: { canonical: { in: ['rice', 'milk', 'parmesan', 'mushroom'] } } });
    await prisma.userIngredient.createMany({ data: ids.map(i => ({ userId: user.id, ingredientId: i.id })) });
    const recipe = await prisma.recipe.create({ data: {
      title: 'Optional milk rice', instructions: 'Cook rice. Serve.', createdBy: user.id,
      recipeIngredients: { create: ids.filter(i => ['rice', 'milk'].includes(i.canonical)).map(i => ({ ingredientId: i.id, optional: i.canonical === 'milk' })) },
    } });
    optionalMilkRecipe = recipe.id;
    const tomato = await prisma.ingredient.findUniqueOrThrow({ where: { canonical: 'tomato' } });
    const rawRecipe = await prisma.recipe.create({ data: {
      title: 'Tomato with hidden milk', instructions: 'Heat tomatoes with milk. Serve.', createdBy: user.id,
      recipeIngredients: { create: { ingredientId: tomato.id, rawText: 'tomato with milk' } },
    } });
    rawMilkRecipe = rawRecipe.id;
    invalidateRecipeIndex();
  });

  it('requires authentication and validates presets', async () => {
    await request(app).get('/api/preferences').expect(401);
    await request(app).put('/api/preferences').set('Authorization', authorization)
      .send({ avoidedAllergens: ['invalid'], excludedIngredients: [] }).expect(400);
  });

  it('persists normalized custom ingredients without changing another user', async () => {
    const saved = await request(app).put('/api/preferences').set('Authorization', authorization)
      .send({ avoidedAllergens: ['milk'], excludedIngredients: ['mushrooms', 'mushroom'] }).expect(200);
    expect(saved.body.data.excludedIngredients).toEqual(['mushroom']);
    const mine = await request(app).get('/api/preferences').set('Authorization', authorization).expect(200);
    expect(mine.body.data.avoidedAllergens).toEqual(['milk']);
    const other = await request(app).get('/api/preferences').set('Authorization', otherAuthorization).expect(200);
    expect(other.body.data.avoidedAllergens).toEqual([]);
  });

  it('persists reviewed ingredients and keeps them when older clients omit the field', async () => {
    await request(app).put('/api/preferences').set('Authorization', authorization)
      .send({ avoidedAllergens: ['milk'], excludedIngredients: [], reviewedIngredients: ['Kimchee', 'Mystery Sauce'] }).expect(200);
    let saved = await request(app).get('/api/preferences').set('Authorization', authorization).expect(200);
    expect(saved.body.data.reviewedIngredients).toEqual(['kimchi', 'mystery sauce']);

    await request(app).put('/api/preferences').set('Authorization', authorization)
      .send({ avoidedAllergens: ['milk'], excludedIngredients: [] }).expect(200);
    saved = await request(app).get('/api/preferences').set('Authorization', authorization).expect(200);
    expect(saved.body.data.reviewedIngredients).toEqual(['kimchi', 'mystery sauce']);
  });

  it('validates reviewed ingredient strings and the 100 item limit', async () => {
    await request(app).put('/api/preferences').set('Authorization', authorization)
      .send({ avoidedAllergens: [], excludedIngredients: [], reviewedIngredients: ['ok', 42] }).expect(400);
    await request(app).put('/api/preferences').set('Authorization', authorization)
      .send({ avoidedAllergens: [], excludedIngredients: [], reviewedIngredients: Array.from({ length: 101 }, (_, i) => `item ${i}`) }).expect(400);
  });

  it('excludes optional milk and warns on direct access', async () => {
    const suggestions = await request(app).get('/api/recipes/suggestions').set('Authorization', authorization).expect(200);
    const { cookNow, oneAway, twoAway } = suggestions.body.data;
    expect([...cookNow, ...oneAway, ...twoAway].map(r => r.id)).not.toContain(optionalMilkRecipe);
    expect(suggestions.body.data.excludedCount).toBeGreaterThan(0);
    const detail = await request(app).get(`/api/recipes/${optionalMilkRecipe}`).set('Authorization', authorization).expect(200);
    expect(detail.body.data.recipe.ingredientReview.blocked).toContain('Milk');
  });

  it('checks raw imported text before normalization hides milk', async () => {
    const suggestions = await request(app).get('/api/recipes/suggestions').set('Authorization', authorization).expect(200);
    const { cookNow, oneAway, twoAway } = suggestions.body.data;
    expect([...cookNow, ...oneAway, ...twoAway].map(r => r.id)).not.toContain(rawMilkRecipe);
    const detail = await request(app).get(`/api/recipes/${rawMilkRecipe}`).set('Authorization', authorization).expect(200);
    expect(detail.body.data.recipe.ingredientReview.blocked).toContain('tomato with milk');
  });

  it('can clear all saved exclusions', async () => {
    await request(app).put('/api/preferences').set('Authorization', authorization)
      .send({ avoidedAllergens: [], excludedIngredients: [] }).expect(200);
    const suggestions = await request(app).get('/api/recipes/suggestions').set('Authorization', authorization).expect(200);
    expect(suggestions.body.data.cookNow.map((r: { id: number }) => r.id)).toContain(optionalMilkRecipe);
  });
});
