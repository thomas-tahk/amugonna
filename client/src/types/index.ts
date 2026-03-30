// User types
export interface User {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  createdAt: string;
  updatedAt?: string;
}

export interface AuthResponse {
  success: boolean;
  message: string;
  data: {
    user: User;
    token: string;
  };
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}

// Ingredient types
export interface Ingredient {
  id: number;
  name: string;
  category: string;
  commonUnits: string[];
  nutritionalInfo?: any;
}

export interface UserIngredient {
  id: number;
  userId: number;
  ingredientId: number;
  quantity?: number;
  unit?: string;
  expirationDate?: string;
  addedAt: string;
  ingredient: Ingredient;
}

export interface AddIngredientData {
  ingredientId: number;
  quantity?: number;
  unit?: string;
  expirationDate?: string;
}

export interface UpdateIngredientData {
  quantity?: number;
  unit?: string;
  expirationDate?: string;
}

// API Response types
export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data?: T;
  errors?: string[];
}

export interface IngredientsResponse {
  ingredients: Ingredient[];
  total: number;
}

export interface UserIngredientsResponse {
  ingredients: UserIngredient[];
}

export interface CategoriesResponse {
  categories: string[];
}

// Recipe types
export interface RecipeIngredient {
  id: number;
  ingredient: Ingredient;
  quantity?: number;
  unit?: string;
  optional: boolean;
  substitutions: string[];
  preparationNote?: string;
}

export interface Recipe {
  id: number;
  title: string;
  description?: string;
  instructions: string;
  prepTime?: number;
  cookTime?: number;
  servings: number;
  images: string[];
  videoUrl?: string;
  cuisineTypes: string[];
  tags: string[];
  dietaryTags: string[];
  allergens: string[];
  difficulty?: string;
  personalNotes?: string;
  modifications?: string;
  rating?: number;
  timesCooked: number;
  lastCooked?: string;
  isPublic: boolean;
  sourceUrl?: string;
  sourceName?: string;
  createdBy: number;
  createdAt: string;
  updatedAt: string;
  creator?: {
    id: number;
    firstName: string;
    lastName: string;
  };
  recipeIngredients: RecipeIngredient[];
  isFavorite?: boolean;
}

export interface RecipesResponse {
  recipes: Recipe[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

// Suggestion types
export interface RecipeSuggestion {
  id: number;
  title: string;
  description?: string;
  prepTime?: number;
  cookTime?: number;
  servings: number;
  difficulty?: string;
  cuisineTypes: string[];
  tags: string[];
  dietaryTags: string[];
  allergens: string[];
  images: string[];
  isFavorite: boolean;
  matchScore: number;
  matchedIngredients: number;
  totalIngredients: number;
  missingIngredients: { id: number; name: string; category: string }[];
  hasOptionalIngredients: boolean;
}

export interface SuggestionsResponse {
  pantrySize: number;
  suggestions: {
    canMakeNow: RecipeSuggestion[];
    almostThere: RecipeSuggestion[];
    aspirational: RecipeSuggestion[];
  };
}

// Recipe form types
export interface RecipeIngredientInput {
  ingredientId: number;
  name: string;
  commonUnits: string[];
  quantity?: number;
  unit?: string;
  optional: boolean;
  preparationNote?: string;
}

export interface CreateRecipeData {
  title: string;
  description?: string;
  instructions: string;
  ingredients: {
    ingredientId: number;
    quantity?: number;
    unit?: string;
    optional?: boolean;
    preparationNote?: string;
  }[];
  prepTime?: number;
  cookTime?: number;
  servings?: number;
  cuisineTypes?: string[];
  tags?: string[];
  dietaryTags?: string[];
  allergens?: string[];
  difficulty?: string;
  sourceUrl?: string;
  sourceName?: string;
  isPublic?: boolean;
}

export type UpdateRecipeData = Partial<CreateRecipeData> & {
  personalNotes?: string;
  modifications?: string;
  rating?: number;
};
