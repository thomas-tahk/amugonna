/**
 * TheMealDB meal JSON -> our recipe DTO. Pure.
 * https://www.themealdb.com/api.php — a meal has idMeal, strMeal, strCategory, strArea,
 * strInstructions, strMealThumb, strTags, strYoutube, strSource and strIngredient1..20 / strMeasure1..20
 * (unused slots are "", " " or null).
 */
import { canonicalize } from '../ingredients/index.js';
import { splitSteps } from './steps.js';

export type MealDbMeal = {
  idMeal: string;
  strMeal: string;
  [key: string]: string | null | undefined;
};

export interface RecipeIngredientDto {
  /** ingredient name as written by the source */
  name: string;
  /** normalizer output, the matching identity */
  canonical: string;
  /** "2 tbsp" — the quantity text on its own */
  measure: string | null;
  /** "2 tbsp Plain Flour" */
  rawText: string;
  quantity?: number | null;
  unit?: string | null;
  optional?: boolean;
}

export interface RecipeDto {
  externalSource: string;
  externalId: string;
  title: string;
  description?: string | null;
  /** clean steps joined by "\n" (re-splittable with splitSteps) */
  instructions: string;
  category: string | null;
  area: string | null;
  imageUrl: string | null;
  videoUrl?: string | null;
  sourceUrl: string | null;
  sourceName: string | null;
  attribution: string | null;
  license: string | null;
  tags: string[];
  prepTime?: number | null;
  cookTime?: number | null;
  servings?: number | null;
  difficulty?: string | null;
  cuisineTypes?: string[];
  dietaryTags?: string[];
  allergens?: string[];
  ingredients: RecipeIngredientDto[];
}

/** How imported recipes are labelled. Defaults describe real TheMealDB data. */
export interface MealDbProfile {
  externalSource?: string;
  sourceName?: string;
  attribution?: string;
  license?: string;
  /** when strSource is blank, link to the meal's TheMealDB page (false for fixtures) */
  linkToMealDb?: boolean;
}

export const MEALDB_PROFILE: Required<MealDbProfile> = {
  externalSource: 'TheMealDB',
  sourceName: 'TheMealDB',
  attribution: 'Recipe from TheMealDB (themealdb.com)',
  license: 'TheMealDB API terms — free test key, development use',
  linkToMealDb: true,
};

const clean = (v: string | null | undefined): string | null => {
  const t = typeof v === 'string' ? v.trim() : '';
  return t === '' ? null : t;
};

export function mapMealDbMeal(meal: MealDbMeal, profile: MealDbProfile = {}): RecipeDto {
  const p = { ...MEALDB_PROFILE, ...profile };
  const id = String(meal.idMeal).trim();

  const ingredients: RecipeIngredientDto[] = [];
  for (let i = 1; i <= 20; i++) {
    const name = clean(meal[`strIngredient${i}`]);
    if (!name) continue;
    const measure = clean(meal[`strMeasure${i}`]);
    ingredients.push({
      name,
      canonical: canonicalize(name),
      measure,
      rawText: `${measure ?? ''} ${name}`.trim(),
    });
  }

  return {
    externalSource: p.externalSource,
    externalId: id,
    title: (clean(meal.strMeal) ?? `Meal ${id}`),
    instructions: splitSteps(meal.strInstructions ?? '').join('\n'),
    category: clean(meal.strCategory),
    area: clean(meal.strArea),
    imageUrl: clean(meal.strMealThumb),
    videoUrl: clean(meal.strYoutube),
    sourceUrl: clean(meal.strSource) ?? (p.linkToMealDb ? `https://www.themealdb.com/meal/${id}` : null),
    sourceName: p.sourceName,
    attribution: p.attribution,
    license: p.license,
    tags: (meal.strTags ?? '')
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean),
    ingredients,
  };
}
