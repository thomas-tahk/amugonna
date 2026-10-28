/**
 * Pure recipe matching. No DB. Given pantry canonicals and an in-memory recipe index, tier recipes by how many
 * required (non-optional, non-staple) ingredients are missing.
 */
import { getEntry, satisfies } from '../ingredients/index.js';
import type { SatisfyResult } from '../ingredients/index.js';

export interface IndexedIngredient {
  canonical: string;
  /** DB display name, used when the vocabulary has no entry */
  name: string;
  optional: boolean;
}

export interface IndexedRecipe {
  id: number;
  title: string;
  imageUrl: string | null;
  category: string | null;
  area: string | null;
  prepTime: number | null;
  cookTime: number | null;
  ingredients: IndexedIngredient[];
}

export interface RecipeMatch {
  id: number;
  title: string;
  imageUrl: string | null;
  category: string | null;
  area: string | null;
  totalTime: number | null;
  ingredientCount: number;
  usedCount: number;
  missing: { name: string; canonical: string }[];
  swaps: { need: string; using: string }[];
}

export interface MatchResult {
  cookNow: RecipeMatch[];
  oneAway: RecipeMatch[];
  twoAway: RecipeMatch[];
}

/** Vocabulary display name, falling back to the given name. */
export function displayName(canonical: string, fallback: string): string {
  return getEntry(canonical)?.name ?? fallback;
}

export function totalTime(prepTime: number | null, cookTime: number | null): number | null {
  return prepTime == null && cookTime == null ? null : (prepTime ?? 0) + (cookTime ?? 0);
}

export function isStapleCanonical(canonical: string): boolean {
  return getEntry(canonical)?.staple === true;
}

export function matchRecipes(pantryCanonicals: string[], recipes: IndexedRecipe[]): MatchResult {
  const pantry = [...new Set(pantryCanonicals)];
  const memo = new Map<string, SatisfyResult>();
  const check = (c: string) => {
    let r = memo.get(c);
    if (!r) {
      r = satisfies(pantry, c);
      memo.set(c, r);
    }
    return r;
  };

  const tiers: RecipeMatch[][] = [[], [], []];

  for (const recipe of recipes) {
    let ingredientCount = 0;
    let usedCount = 0;
    const missing: RecipeMatch['missing'] = [];
    const swaps: RecipeMatch['swaps'] = [];

    for (const ing of recipe.ingredients) {
      if (ing.optional || isStapleCanonical(ing.canonical)) continue;
      ingredientCount++;
      const r = check(ing.canonical);
      if (r.status === 'have') usedCount++;
      else if (r.status === 'swap') {
        usedCount++;
        swaps.push({
          need: displayName(ing.canonical, ing.name),
          using: displayName(r.using ?? '', r.using ?? ''),
        });
      } else if (r.status === 'missing') {
        missing.push({ name: displayName(ing.canonical, ing.name), canonical: ing.canonical });
      }
    }

    if (ingredientCount === 0 || missing.length > 2) continue;
    tiers[missing.length].push({
      id: recipe.id,
      title: recipe.title,
      imageUrl: recipe.imageUrl,
      category: recipe.category,
      area: recipe.area,
      totalTime: totalTime(recipe.prepTime, recipe.cookTime),
      ingredientCount,
      usedCount,
      missing,
      swaps,
    });
  }

  const sort = (list: RecipeMatch[]): RecipeMatch[] =>
    list.sort(
      (a, b) =>
        a.swaps.length - b.swaps.length ||
        b.usedCount - a.usedCount ||
        a.ingredientCount - b.ingredientCount ||
        a.title.localeCompare(b.title)
    );

  return { cookNow: sort(tiers[0]), oneAway: sort(tiers[1]), twoAway: sort(tiers[2]) };
}
