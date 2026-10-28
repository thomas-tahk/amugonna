export { matchRecipes, mergeIngredients, displayName, totalTime, isStapleCanonical } from './match.js';
export type { IndexedRecipe, IndexedIngredient, RecipeMatch, MatchResult } from './match.js';
export { getRecipesFor, invalidateRecipeIndex, INDEX_TTL_MS } from './recipeIndex.js';
