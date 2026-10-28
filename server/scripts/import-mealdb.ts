/**
 * Import recipes from TheMealDB into Postgres. Idempotent (keyed on externalSource + externalId).
 *
 *   npm run import:mealdb -w server                       fetch search.php?f=a..z (~1 req/s)
 *   npm run import:mealdb -w server -- --file x.json      read { "meals": [...] } instead of fetching
 *
 * Needs DATABASE_URL (and DIRECT_URL) like the rest of the server.
 */
import { PrismaClient } from '@prisma/client';
import {
  fetchAllMeals,
  importMeals,
  loadMealFile,
  summarise,
  syncVocabulary,
} from '../src/lib/recipes/index.js';
import type { MealDbMeal, MealDbProfile } from '../src/lib/recipes/index.js';

const SYSTEM_EMAIL = 'system@amugonna.internal';

function parseArgs(argv: string[]): { file?: string } {
  const i = argv.indexOf('--file');
  if (i === -1) return {};
  const file = argv[i + 1];
  if (!file || file.startsWith('--')) throw new Error('--file needs a path');
  return { file };
}

async function main() {
  const { file } = parseArgs(process.argv.slice(2));

  let meals: MealDbMeal[];
  let profile: MealDbProfile = {};
  if (file) {
    ({ meals, profile } = loadMealFile(file));
    console.log(`Read ${meals.length} meals from ${file}`);
  } else {
    console.log('Fetching from TheMealDB (a..z, about 1 request per second)...');
    meals = await fetchAllMeals({ onLetter: (l, n) => console.log(`  ${l}: ${n}`) });
  }

  const prisma = new PrismaClient();
  try {
    const systemUser = await prisma.user.upsert({
      where: { email: SYSTEM_EMAIL },
      update: {},
      create: { email: SYSTEM_EMAIL, password: 'seed-user-no-login', firstName: 'Amugonna', lastName: 'System' },
    });
    await syncVocabulary(prisma);
    const result = await importMeals(prisma, meals, systemUser.id, profile);
    console.log(summarise(result, 40));
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error('Import failed:', err);
  process.exit(1);
});
