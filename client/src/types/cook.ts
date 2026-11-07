export interface RecipeMatch {
  koreanTitle?: string;
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

export interface Suggestions {
  exclusionsActive?: boolean;
  excludedCount?: number;
  reviewCount?: number;
  pantrySize: number;
  totalRecipes: number;
  cookNow: RecipeMatch[];
  oneAway: RecipeMatch[];
  twoAway: RecipeMatch[];
}

export type IngredientStatus = 'have' | 'swap' | 'missing' | 'staple';

export interface CookIngredient {
  sourceText?: string | null;
  name: string;
  canonical: string;
  measure: string | null;
  optional: boolean;
  status: IngredientStatus;
  using?: string;
}

export interface CookRecipe {
  koreanTitle?: string | null;
  ingredientReview?: { blocked: string[]; uncertain: string[] };
  id: number;
  title: string;
  description: string | null;
  imageUrl: string | null;
  category: string | null;
  area: string | null;
  servings: number | null;
  prepTime: number | null;
  cookTime: number | null;
  steps: string[];
  sourceName: string | null;
  sourceUrl: string | null;
  attribution: string | null;
  license: string | null;
  ingredients: CookIngredient[];
  isFavorite: boolean;
  isOwner: boolean;
}
