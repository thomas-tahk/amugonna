import { PrismaClient } from '@prisma/client';
import { fileURLToPath } from 'node:url';
import { canonicalize } from '../src/lib/ingredients/index.js';
import { importMeals, loadMealFile, splitSteps, syncVocabulary, upsertRecipe } from '../src/lib/recipes/index.js';
import type { RecipeDto } from '../src/lib/recipes/index.js';
import { staticRecipes, type StaticRecipe } from './seed-recipes.js';

const dietaryRestrictions = [
  { name: 'Vegetarian', description: 'No meat, poultry, or fish', category: 'diet' },
  { name: 'Vegan', description: 'No animal products', category: 'diet' },
  { name: 'Gluten-Free', description: 'No wheat, barley, rye, or gluten-containing ingredients', category: 'intolerance' },
  { name: 'Dairy-Free', description: 'No milk or dairy products', category: 'intolerance' },
  { name: 'Nut Allergy', description: 'No tree nuts or peanuts', category: 'allergy' },
  { name: 'Shellfish Allergy', description: 'No shellfish or crustaceans', category: 'allergy' },
  { name: 'Egg Allergy', description: 'No eggs or egg-containing products', category: 'allergy' },
  { name: 'Soy Allergy', description: 'No soy or soy-containing products', category: 'allergy' },
  { name: 'Keto', description: 'Low carbohydrate, high fat diet', category: 'diet' },
  { name: 'Paleo', description: 'No grains, legumes, or processed foods', category: 'diet' },
  { name: 'Low Sodium', description: 'Reduced sodium intake', category: 'diet' },
  { name: 'Diabetic Friendly', description: 'Low sugar and controlled carbohydrates', category: 'diet' },
];

const SYSTEM_EMAIL = 'system@amugonna.internal';
const FIXTURE_PATH = fileURLToPath(new URL('./fixtures/mealdb-sample.json', import.meta.url));

const slug = (title: string) =>
  title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

/** A hand-written starter recipe -> the same DTO the importer produces. */
export function starterToDto(r: StaticRecipe): RecipeDto {
  return {
    externalSource: 'amugonna-seed',
    externalId: slug(r.title),
    title: r.title,
    description: r.description,
    instructions: splitSteps(r.instructions).join('\n'),
    category: null,
    area: r.cuisineTypes[0] ?? null,
    imageUrl: null,
    sourceUrl: null,
    sourceName: 'Amugonna',
    attribution: 'Amugonna starter recipe',
    license: 'Original content',
    tags: r.tags,
    prepTime: r.prepTime,
    cookTime: r.cookTime,
    servings: r.servings,
    difficulty: r.difficulty,
    cuisineTypes: r.cuisineTypes,
    dietaryTags: r.dietaryTags,
    allergens: r.allergens,
    ingredients: r.ingredients.map((i) => {
      const measure = [i.quantity, i.unit].filter((x) => x != null).join(' ') || null;
      return {
        name: i.name,
        canonical: canonicalize(i.name),
        measure,
        rawText: `${measure ?? ''} ${i.name}`.trim(),
        quantity: i.quantity,
        unit: i.unit,
        optional: i.optional ?? false,
      };
    }),
  };
}

/** Re-runnable: everything is an upsert. */
export async function runSeed(prisma: PrismaClient, opts: { log?: (msg: string) => void } = {}) {
  const log = opts.log ?? console.log;
  log('Starting database seed...');

  const systemUser = await prisma.user.upsert({
    where: { email: SYSTEM_EMAIL },
    update: {},
    create: { email: SYSTEM_EMAIL, password: 'seed-user-no-login', firstName: 'Amugonna', lastName: 'System' },
  });
  log(`System user ID: ${systemUser.id}`);

  const vocab = await syncVocabulary(prisma);
  log(`Vocabulary synced: ${vocab.created} created, ${vocab.updated} updated`);

  for (const restriction of dietaryRestrictions) {
    await prisma.dietaryRestriction.upsert({ where: { name: restriction.name }, update: {}, create: restriction });
  }
  log(`${dietaryRestrictions.length} dietary restrictions upserted`);

  let created = 0;
  let updated = 0;
  for (const recipe of staticRecipes) {
    const dto = starterToDto(recipe);
    // Databases seeded before the import columns existed hold these recipes without an external id:
    // claim them (by title, system user) so they are updated in place, not duplicated.
    const keyTaken = await prisma.recipe.findUnique({
      where: { externalSource_externalId: { externalSource: dto.externalSource, externalId: dto.externalId } },
      select: { id: true },
    });
    if (!keyTaken) {
      const legacy = await prisma.recipe.findFirst({
        where: { title: dto.title, createdBy: systemUser.id, externalSource: null },
        select: { id: true },
      });
      if (legacy) {
        await prisma.recipe.update({
          where: { id: legacy.id },
          data: { externalSource: dto.externalSource, externalId: dto.externalId },
        });
      }
    }
    const r = await upsertRecipe(prisma, dto, systemUser.id);
    if (r.created) created++;
    else updated++;
  }
  log(`Starter recipes: ${created} created, ${updated} updated`);

  const fixture = loadMealFile(FIXTURE_PATH);
  const res = await importMeals(prisma, fixture.meals, systemUser.id, fixture.profile);
  log(`Fixture recipes: ${res.created} created, ${res.updated} updated`);

  log('Database seed completed successfully!');
}

// Run when invoked as a script (tsx prisma/seed.ts / prisma db seed), not when imported by tests.
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const prisma = new PrismaClient();
  runSeed(prisma)
    .catch((e) => {
      console.error('Error during seed:', e);
      process.exitCode = 1;
    })
    .finally(() => prisma.$disconnect());
}
