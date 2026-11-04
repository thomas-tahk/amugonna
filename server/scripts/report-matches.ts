/**
 * Prints how well the recipes in the DB serve three reference pantries, using the real matcher (no HTTP).
 *
 *   npm run report:matches -w server
 *   npm run report:matches -w server -- --json report.json
 *
 * Also appends the report to $GITHUB_STEP_SUMMARY when set. Needs DATABASE_URL.
 */
import { appendFileSync, writeFileSync } from 'node:fs';
import type { PrismaClient } from '@prisma/client';
import { canonicalize } from '../src/lib/ingredients/index.js';
import { matchRecipes, getRecipesFor } from '../src/lib/matching/index.js';
import { formatReport, pct, summarisePantry } from '../src/lib/matching/report.js';
import type { Report } from '../src/lib/matching/report.js';
import { prisma } from '../src/lib/database.js';

const BASIC = ['eggs', 'rice', 'onion', 'garlic', 'chicken breast', 'pasta', 'chopped tomatoes', 'cheddar'];
const BASIC_PLUS = [...BASIC, 'butter', 'milk', 'flour', 'sugar', 'lemon', 'potato', 'carrot', 'bread'];
const STOCKED = [
  ...BASIC_PLUS,
  'bell pepper', 'spinach', 'mushroom', 'ground beef', 'bacon', 'parmesan', 'soy sauce', 'ginger',
  'chicken stock', 'kidney bean', 'coconut milk', 'cumin', 'paprika', 'chilli flakes', 'honey',
  'yogurt', 'cream', 'green onion',
];

function parseArgs(argv: string[]): { json?: string } {
  const i = argv.indexOf('--json');
  if (i === -1) return {};
  const p = argv[i + 1];
  if (!p || p.startsWith('--')) throw new Error('--json needs a path');
  return { json: p };
}

async function build(db: PrismaClient): Promise<Report> {
  const sources = await db.recipe.groupBy({ by: ['externalSource'], _count: { _all: true } });
  const bySource = sources
    .map((s) => ({ source: s.externalSource ?? '(none)', count: s._count._all }))
    .sort((a, b) => b.count - a.count);
  const totalRecipes = bySource.reduce((n, s) => n + s.count, 0);

  const total = await db.recipeIngredient.count();
  const inVocabulary = await db.recipeIngredient.count({ where: { ingredient: { sortOrder: { not: null } } } });
  const nonVocab = await db.$queryRaw<{ name: string; count: bigint }[]>`
    SELECT i.name AS name, COUNT(*) AS count
    FROM recipe_ingredients ri JOIN ingredients i ON i.id = ri.ingredient_id
    WHERE i.sort_order IS NULL
    GROUP BY i.name ORDER BY count DESC, i.name ASC LIMIT ${Number(process.env.REPORT_TOP ?? 40)}`;

  const recipes = await getRecipesFor(0); // public recipes only (there is no user 0)
  const defs: [string, string[]][] = [
    ['BASIC', BASIC],
    ['BASIC_PLUS', BASIC_PLUS],
    ['STOCKED', STOCKED],
  ];
  const pantries = defs.map(([name, items]) => {
    const canon = items.map(canonicalize);
    return summarisePantry(name, canon.length, matchRecipes(canon, recipes));
  });

  return {
    generatedAt: new Date().toISOString(),
    totalRecipes,
    bySource,
    vocabulary: { total, inVocabulary, rate: pct(inVocabulary, total) },
    topNonVocabulary: nonVocab.map((n) => ({ name: n.name, count: Number(n.count) })),
    pantries,
  };
}

async function main() {
  const { json } = parseArgs(process.argv.slice(2));
  const report = await build(prisma);
  const text = formatReport(report);
  console.log(text);
  if (json) {
    writeFileSync(json, JSON.stringify(report, null, 2));
    console.log(`Wrote ${json}`);
  }
  if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, text + '\n');
}

main()
  .catch((e) => {
    console.error('Report failed:', e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
