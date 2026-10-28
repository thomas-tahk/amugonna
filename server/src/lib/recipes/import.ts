/**
 * TheMealDB import: fetch (a..z search), map, upsert, summarise.
 * fetch is injectable so it can be tested without the network.
 */
import type { PrismaClient } from '@prisma/client';
import { mapMealDbMeal, type MealDbMeal, type MealDbProfile } from './mealdb.js';
import { upsertRecipe, type UpsertRecipeResult } from './upsert.js';

export const MEALDB_SEARCH_URL = 'https://www.themealdb.com/api/json/v1/1/search.php';

export interface FetchOptions {
  fetchImpl?: typeof fetch;
  /** attempts per request (default 3) */
  attempts?: number;
  /** per-request timeout (default 15s) */
  timeoutMs?: number;
  /** wait between failed attempts, multiplied by the attempt number (default 1s) */
  retryDelayMs?: number;
  /** pause between letters (default 1000ms ~ 1 req/s) */
  delayMs?: number;
  onLetter?: (letter: string, count: number) => void;
}

const sleep = (ms: number) => (ms > 0 ? new Promise<void>((r) => setTimeout(r, ms)) : Promise.resolve());

/** GET search.php?f=<letter>. Returns [] when TheMealDB has none ({"meals": null}). */
export async function fetchMealDbLetter(letter: string, opts: FetchOptions = {}): Promise<MealDbMeal[]> {
  const { fetchImpl = fetch, attempts = 3, timeoutMs = 15_000, retryDelayMs = 1000 } = opts;
  const url = `${MEALDB_SEARCH_URL}?f=${encodeURIComponent(letter)}`;
  let lastError: unknown;
  for (let attempt = 1; attempt <= attempts; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetchImpl(url, { signal: controller.signal, headers: { accept: 'application/json' } });
      if (!res.ok) throw new Error(`TheMealDB ${url} responded ${res.status}`);
      const body = (await res.json()) as { meals?: MealDbMeal[] | null };
      return Array.isArray(body.meals) ? body.meals : [];
    } catch (err) {
      lastError = err;
      if (attempt < attempts) await sleep(retryDelayMs * attempt);
    } finally {
      clearTimeout(timer);
    }
  }
  throw lastError instanceof Error ? lastError : new Error(String(lastError));
}

/** a..z, ~1 request per second, de-duplicated by idMeal. */
export async function fetchAllMeals(opts: FetchOptions = {}): Promise<MealDbMeal[]> {
  const { delayMs = 1000, onLetter } = opts;
  const byId = new Map<string, MealDbMeal>();
  const letters = 'abcdefghijklmnopqrstuvwxyz';
  for (let i = 0; i < letters.length; i++) {
    const meals = await fetchMealDbLetter(letters[i], opts);
    for (const m of meals) if (!byId.has(String(m.idMeal))) byId.set(String(m.idMeal), m);
    onLetter?.(letters[i], meals.length);
    if (i < letters.length - 1) await sleep(delayMs);
  }
  return [...byId.values()];
}

export interface ImportResult {
  fetched: number;
  created: number;
  updated: number;
  ingredientsCreated: number;
  /** canonical -> number of recipe lines that used it */
  unmatched: Map<string, number>;
}

export async function importMeals(
  prisma: PrismaClient,
  meals: MealDbMeal[],
  systemUserId: number,
  profile: MealDbProfile = {},
  upsert: (p: PrismaClient, dto: ReturnType<typeof mapMealDbMeal>, userId: number) => Promise<UpsertRecipeResult> = upsertRecipe
): Promise<ImportResult> {
  const result: ImportResult = { fetched: meals.length, created: 0, updated: 0, ingredientsCreated: 0, unmatched: new Map() };
  for (const meal of meals) {
    const r = await upsert(prisma, mapMealDbMeal(meal, profile), systemUserId);
    if (r.created) result.created++;
    else result.updated++;
    result.ingredientsCreated += r.ingredientsCreated;
    for (const u of r.unmatched) result.unmatched.set(u.canonical, (result.unmatched.get(u.canonical) ?? 0) + 1);
  }
  return result;
}

export function summarise(r: ImportResult, top = 40): string {
  const lines = [
    `fetched ${r.fetched} | created ${r.created} | updated ${r.updated} | ingredients created ${r.ingredientsCreated}`,
  ];
  const ranked = [...r.unmatched.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, top);
  if (ranked.length > 0) {
    lines.push(`Top ${ranked.length} unmatched ingredient names (${r.unmatched.size} distinct, not in the vocabulary):`);
    for (const [name, n] of ranked) lines.push(`  ${String(n).padStart(4)}  ${name}`);
  } else {
    lines.push('No unmatched ingredient names.');
  }
  return lines.join('\n');
}
