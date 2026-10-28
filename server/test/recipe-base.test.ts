import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { prisma } from '../src/lib/database.js';
import { getVocabulary } from '../src/lib/ingredients/index.js';
import { runSeed, shouldLoadFixture } from '../prisma/seed.js';
import { importMeals } from '../src/lib/recipes/import.js';
import { loadMealFile } from '../src/lib/recipes/file.js';
import { syncVocabulary, upsertRecipe } from '../src/lib/recipes/upsert.js';
import { mapMealDbMeal } from '../src/lib/recipes/mealdb.js';

const hasDb = process.env.TEST_DB_ENABLED === '1';

if (!hasDb) {
  console.warn(
    '[server tests] TEST_DATABASE_URL is not set: skipping DB integration tests (recipe base). ' +
      'Set TEST_DATABASE_URL (a database whose name contains "test"; run `npx prisma migrate deploy`) to run them.'
  );
}

afterAll(async () => {
  await prisma.$disconnect();
});

describe.skipIf(!hasDb)('recipe base (needs a migrated TEST_DATABASE_URL)', () => {
  let systemUserId: number;

  const counts = async () => ({
    recipes: await prisma.recipe.count(),
    recipeIngredients: await prisma.recipeIngredient.count(),
    ingredients: await prisma.ingredient.count(),
  });

  beforeAll(async () => {
    await runSeed(prisma, { log: () => {} });
    systemUserId = (await prisma.user.findUniqueOrThrow({ where: { email: 'system@amugonna.internal' } })).id;
  }, 120_000);

  it('has at least 45 recipes (21 starter + fixture)', async () => {
    expect(await prisma.recipe.count()).toBeGreaterThanOrEqual(45);
    expect(await prisma.recipe.count({ where: { externalSource: 'amugonna-seed' } })).toBe(21);
    expect(await prisma.recipe.count({ where: { externalSource: 'fixture' } })).toBeGreaterThanOrEqual(25);
  });

  it('re-running the seed and importing the fixture twice leaves identical counts', async () => {
    const before = await counts();
    await runSeed(prisma, { log: () => {} });
    const meals = loadMealFile(new URL('../prisma/fixtures/mealdb-sample.json', import.meta.url).pathname);
    await importMeals(prisma, meals.meals, systemUserId, meals.profile);
    await importMeals(prisma, meals.meals, systemUserId, meals.profile);
    expect(await counts()).toEqual(before);
  });

  it('every recipe_ingredient has an ingredient, and >= 95% link to vocabulary rows', async () => {
    const rows: { total: bigint; orphaned: bigint; vocab: bigint }[] = await prisma.$queryRaw`
      SELECT count(*) AS total,
             count(*) FILTER (WHERE i.id IS NULL OR i.canonical IS NULL OR i.canonical = '') AS orphaned,
             count(*) FILTER (WHERE i.sort_order IS NOT NULL) AS vocab
      FROM recipe_ingredients ri
      JOIN recipes r ON r.id = ri.recipe_id AND r.external_source IN ('amugonna-seed', 'fixture')
      LEFT JOIN ingredients i ON i.id = ri.ingredient_id`;
    const total = Number(rows[0].total);
    const rate = Number(rows[0].vocab) / total;
    console.log(`[recipe-base] vocabulary match rate: ${(rate * 100).toFixed(1)}% (${rows[0].vocab}/${total})`);
    expect(total).toBeGreaterThan(300);
    expect(Number(rows[0].orphaned)).toBe(0);
    expect(rate).toBeGreaterThanOrEqual(0.95);
  });

  it('every public recipe has attribution, and every seeded recipe has ingredients', async () => {
    expect(await prisma.recipe.count({ where: { isPublic: true, attribution: null } })).toBe(0);
    expect(await prisma.recipe.count({ where: { isPublic: true, recipeIngredients: { none: {} } } })).toBe(0);
  });

  it('marks staples (water, salt, black pepper, cooking oil and its children)', async () => {
    const staples = await prisma.ingredient.findMany({ where: { isStaple: true }, select: { canonical: true } });
    const names = staples.map((s) => s.canonical);
    for (const c of ['water', 'salt', 'black pepper', 'cooking oil', 'olive oil']) expect(names).toContain(c);
    expect(names).not.toContain('chicken');
    const expected = getVocabulary().filter((e) => e.staple).length;
    expect(names.length).toBeGreaterThanOrEqual(expected);
  });

  it('syncVocabulary loads the whole vocabulary with parent links and order', async () => {
    const vocab = getVocabulary();
    expect(await prisma.ingredient.count({ where: { sortOrder: { not: null } } })).toBeGreaterThanOrEqual(vocab.length);
    const redOnion = await prisma.ingredient.findUniqueOrThrow({
      where: { canonical: 'red onion' },
      include: { parent: true },
    });
    expect(redOnion.parent?.canonical).toBe('onion');
    expect((await prisma.ingredient.findUniqueOrThrow({ where: { canonical: 'garlic' } })).isCommon).toBe(true);
    const orders = await prisma.ingredient.findMany({
      where: { canonical: { in: [vocab[0].canonical, vocab[5].canonical] } },
      select: { canonical: true, sortOrder: true },
    });
    expect(orders.find((o) => o.canonical === vocab[0].canonical)!.sortOrder).toBe(0);
    expect(orders.find((o) => o.canonical === vocab[5].canonical)!.sortOrder).toBe(5);
  });

  it('upsertRecipe replaces ingredient rows on re-import and reports unmatched names', async () => {
    const base = {
      idMeal: 'test-upsert-1',
      strMeal: 'Upsert Test Dish',
      strInstructions: 'Mix.\r\nServe.',
      strIngredient1: 'Free-range Eggs',
      strMeasure1: '2',
      strIngredient2: 'Zzyzx Rare Spice',
      strMeasure2: '1 tsp',
    };
    const profile = { externalSource: 'test-upsert', attribution: 'Test', license: 'Test', linkToMealDb: false };
    const first = await upsertRecipe(prisma, mapMealDbMeal(base, profile), systemUserId);
    expect(first.created).toBe(true);
    expect(first.unmatched.map((u) => u.canonical)).toEqual(['zzyzx rare spice']);
    expect(first.ingredientsCreated).toBe(1);

    const second = await upsertRecipe(
      prisma,
      mapMealDbMeal({ ...base, strIngredient2: '', strMeasure2: '', strIngredient3: 'Salt', strMeasure3: 'pinch' }, profile),
      systemUserId
    );
    expect(second.created).toBe(false);
    expect(second.ingredientsCreated).toBe(0);
    const recipe = await prisma.recipe.findFirstOrThrow({
      where: { externalSource: 'test-upsert', externalId: 'test-upsert-1' },
      include: { recipeIngredients: { include: { ingredient: true } } },
    });
    expect(recipe.recipeIngredients.map((r) => r.ingredient.canonical).sort()).toEqual(['egg', 'salt']);
    expect(recipe.recipeIngredients.find((r) => r.ingredient.canonical === 'egg')).toMatchObject({
      measure: '2',
      rawText: '2 Free-range Eggs',
    });
    const unknown = await prisma.ingredient.findUniqueOrThrow({ where: { canonical: 'zzyzx rare spice' } });
    expect(unknown.name).toBe('Zzyzx Rare Spice');
    expect(unknown.category).toBeNull();

    // clean up so the suite stays re-runnable
    await prisma.recipeIngredient.deleteMany({ where: { recipeId: recipe.id } });
    await prisma.recipe.delete({ where: { id: recipe.id } });
    await prisma.ingredient.delete({ where: { id: unknown.id } });
  });

  it('syncVocabulary is idempotent', async () => {
    const before = await prisma.ingredient.count();
    await syncVocabulary(prisma);
    expect(await prisma.ingredient.count()).toBe(before);
  });
});

describe('shouldLoadFixture', () => {
  it('loads the fixture outside production, and in production only when forced', () => {
    expect(shouldLoadFixture({ NODE_ENV: 'development' })).toBe(true);
    expect(shouldLoadFixture({})).toBe(true);
    expect(shouldLoadFixture({ NODE_ENV: 'production' })).toBe(false);
    expect(shouldLoadFixture({ NODE_ENV: 'production', SEED_FIXTURE: '1' })).toBe(true);
  });
});
