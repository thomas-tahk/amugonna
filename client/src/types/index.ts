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
  servings?: number;
  imageUrl?: string;
  createdBy?: number;
  createdAt: string;
  nutritionalInfo?: {
    calories: number;
    protein: string;
    carbs: string;
    fat: string;
    fiber?: string;
  };
  difficulty?: 'easy' | 'medium' | 'hard';
  cuisine?: string;
  tags: string[];
  creator?: {
    id: number;
    firstName: string;
    lastName: string;
  };
  recipeIngredients: RecipeIngredient[];
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