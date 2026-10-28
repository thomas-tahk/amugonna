import type { UserIngredient } from './index';

// Mirrors docs/milestones/M1-api.md ("Pantry entry").
export interface CommonItem {
  id: number;
  name: string;
  canonical: string;
}

export interface CommonGroup {
  category: string;
  items: CommonItem[];
}

export interface CommonData {
  groups: CommonGroup[];
  staples: CommonItem[];
}

export interface SuggestItem extends CommonItem {
  category: string | null;
}

export interface BulkResult {
  ingredients: UserIngredient[];
  resolved: { input: string; ingredient: CommonItem; created: boolean }[];
}

export interface ParsedItem {
  input: string;
  name: string;
  canonical: string;
  known: boolean;
  ingredientId: number | null;
}
