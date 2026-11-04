import { readFileSync } from 'node:fs';
import type { MealDbMeal, MealDbProfile } from './mealdb.js';

/**
 * Reads `{ meals: [...] }` in TheMealDB's shape. An optional top-level `source` object
 * ({ externalSource, sourceName, attribution, license, linkToMealDb }) relabels the recipes
 * (used by the test fixture so it is never mistaken for real TheMealDB data).
 */
export function loadMealFile(path: string): { meals: MealDbMeal[]; profile: MealDbProfile } {
  const body = JSON.parse(readFileSync(path, 'utf8')) as { meals?: unknown; source?: MealDbProfile };
  if (!body || !Array.isArray(body.meals)) throw new Error(`${path}: expected { "meals": [ ... ] }`);
  return { meals: body.meals as MealDbMeal[], profile: body.source ?? {} };
}
