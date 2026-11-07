import { canonicalize } from '../ingredients/index.js';

export interface RecipeDraft {
  title: string;
  koreanTitle?: string;
  description: string;
  ingredients: string[];
  instructions: string;
  sourceUrl: string;
  sourceName: string;
  cuisineTypes: string[];
  prepTime: number | null;
  cookTime: number | null;
  servings: number;
}

const emptyDraft = (sourceUrl = '', sourceName = ''): RecipeDraft => ({
  title: '', description: '', ingredients: [], instructions: '', sourceUrl, sourceName,
  cuisineTypes: [], prepTime: null, cookTime: null, servings: 4,
});

export function parsePastedRecipe(text: string): RecipeDraft {
  const lines = text.replace(/\r/g, '').split('\n').map(line => line.trim());
  const title = lines.find(line => line && !isSection(line)) ?? '';
  const ingredients: string[] = [];
  const steps: string[] = [];
  let section = '';
  for (const line of lines) {
    if (isSection(line)) { section = sectionName(line); continue; }
    if (!line) continue;
    if (section === 'ingredients') ingredients.push(line.replace(/^[-*•]\s*/, '').trim());
    if (section === 'instructions') steps.push(line.replace(/^(?:\d+[.)]|[-*•])\s*/, '').trim());
  }
  return { ...emptyDraft(), title, ingredients, instructions: steps.join('\n') };
}

function isSection(line: string): boolean {
  return /^(?:ingredients?|what you need|instructions?|directions?|method|steps?)\s*:?$/i.test(line);
}

function sectionName(line: string): string {
  return /^(?:ingredients?|what you need)/i.test(line) ? 'ingredients' : 'instructions';
}

export function parseRecipeJsonLd(html: string, sourceUrl: string): RecipeDraft | null {
  const scripts = [...html.matchAll(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script\s*>/gi)];
  const recipes: Record<string, unknown>[] = [];
  for (const script of scripts) {
    try { collectRecipes(JSON.parse(script[1]), recipes); } catch { /* ignore malformed blocks */ }
  }
  const recipe = recipes[0];
  if (!recipe) return null;
  const url = new URL(sourceUrl);
  const title = plainText(recipe.name);
  const ingredients = stringList(recipe.recipeIngredient);
  const instructions = instructionSteps(recipe.recipeInstructions);
  if (!title || !ingredients.length || !instructions.length) return null;
  return {
    ...emptyDraft(sourceUrl, authorName(recipe.author) || url.hostname),
    title,
    description: plainText(recipe.description),
    ingredients,
    instructions: instructions.join('\n'),
    cuisineTypes: stringList(recipe.recipeCuisine),
    prepTime: durationMinutes(recipe.prepTime),
    cookTime: durationMinutes(recipe.cookTime),
    servings: parseServings(recipe.recipeYield),
  };
}

function collectRecipes(value: unknown, found: Record<string, unknown>[]): void {
  if (Array.isArray(value)) { value.forEach(item => collectRecipes(item, found)); return; }
  if (!value || typeof value !== 'object') return;
  const obj = value as Record<string, unknown>;
  const type = obj['@type'];
  if ((type === 'Recipe' || Array.isArray(type) && type.includes('Recipe')) && typeof obj.name === 'string') found.push(obj);
  if (Array.isArray(obj['@graph'])) collectRecipes(obj['@graph'], found);
}

function instructionSteps(value: unknown): string[] {
  const output: string[] = [];
  const visit = (item: unknown): void => {
    if (typeof item === 'string') { if (cleanText(item)) output.push(cleanText(item)); return; }
    if (Array.isArray(item)) { item.forEach(visit); return; }
    if (!item || typeof item !== 'object') return;
    const obj = item as Record<string, unknown>;
    if (obj['@type'] === 'HowToSection') visit(obj.itemListElement);
    else if (obj['@type'] === 'HowToStep' || typeof obj.text === 'string') visit(obj.text);
    else visit(obj.itemListElement);
  };
  visit(value);
  return output;
}

function stringList(value: unknown): string[] {
  const values = Array.isArray(value) ? value : [value];
  return values.flatMap(item => typeof item === 'string' && cleanText(item) ? [cleanText(item)] : []);
}

function plainText(value: unknown): string {
  if (typeof value !== 'string') return '';
  return cleanText(value);
}

function authorName(value: unknown): string {
  if (Array.isArray(value)) return authorName(value[0]);
  if (value && typeof value === 'object') return plainText((value as Record<string, unknown>).name);
  return plainText(value);
}

function cleanText(value: string): string {
  return decodeHtml(value.replace(/<[^>]*>/g, ' ')).replace(/\s+/g, ' ').trim();
}

function decodeHtml(value: string): string {
  const named: Record<string, string> = { amp: '&', quot: '"', apos: "'", lt: '<', gt: '>', nbsp: ' ', ndash: '–', mdash: '—', rsquo: '’', lsquo: '‘', ldquo: '“', rdquo: '”' };
  return value.replace(/&(#x[\da-f]+|#\d+|[a-z]+);/gi, (entity, key: string) => {
    if (key[0] === '#') {
      const code = key[1].toLowerCase() === 'x' ? parseInt(key.slice(2), 16) : parseInt(key.slice(1), 10);
      return Number.isInteger(code) && code >= 0 && code <= 0x10ffff && !(code >= 0xd800 && code <= 0xdfff)
        ? String.fromCodePoint(code)
        : entity;
    }
    return named[key.toLowerCase()] ?? entity;
  });
}

function durationMinutes(value: unknown): number | null {
  if (typeof value !== 'string') return null;
  const match = /^PT(?:(\d+)H)?(?:(\d+)M)?$/i.exec(value);
  return match ? Number(match[1] ?? 0) * 60 + Number(match[2] ?? 0) : null;
}

function parseServings(value: unknown): number {
  const raw = Array.isArray(value) ? value[0] : value;
  const count = Number(typeof raw === 'number' ? raw : String(raw ?? '').match(/\d+/)?.[0]);
  return Number.isInteger(count) && count > 0 && count <= 100 ? count : 4;
}

export function validateRecipeDraft(value: unknown): RecipeDraft | null {
  if (!value || typeof value !== 'object') return null;
  const draft = value as Record<string, unknown>;
  const text = (key: string, max: number): string | null => typeof draft[key] === 'string' && (draft[key] as string).trim().length <= max ? (draft[key] as string).trim() : null;
  const title = text('title', 200);
  const koreanTitle = draft.koreanTitle === undefined ? '' : text('koreanTitle', 200);
  const description = text('description', 2000);
  const instructions = text('instructions', 20000);
  const sourceUrl = text('sourceUrl', 2048);
  const sourceName = text('sourceName', 200);
  const ingredients = draft.ingredients;
  const cuisines = draft.cuisineTypes;
  if (!title || koreanTitle === null || description === null || !instructions || sourceUrl === null || sourceName === null ||
      !Array.isArray(ingredients) || ingredients.length < 1 || ingredients.length > 100 ||
      ingredients.some(i => typeof i !== 'string' || !i.trim() || i.length > 500 || !canonicalize(i)) ||
      !Array.isArray(cuisines) || cuisines.some(c => typeof c !== 'string' || c.length > 100)) return null;
  if (!validMinutes(draft.prepTime) || !validMinutes(draft.cookTime) || !Number.isInteger(draft.servings) || Number(draft.servings) < 1 || Number(draft.servings) > 100) return null;
  if (sourceUrl && !safeSourceUrl(sourceUrl)) return null;
  return { title, koreanTitle, description, instructions, sourceUrl, sourceName, ingredients: ingredients.map(i => i.trim()), cuisineTypes: cuisines.map(c => c.trim()).filter(Boolean), prepTime: draft.prepTime as number | null, cookTime: draft.cookTime as number | null, servings: Number(draft.servings) };
}

function validMinutes(value: unknown): boolean {
  return value === null || Number.isInteger(value) && Number(value) >= 0 && Number(value) <= 1440;
}

function safeSourceUrl(value: string): boolean {
  try { const url = new URL(value); return (url.protocol === 'http:' || url.protocol === 'https:') && !url.username && !url.password; } catch { return false; }
}
