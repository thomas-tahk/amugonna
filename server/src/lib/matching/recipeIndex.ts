/**
 * In-memory recipe index for matching. Public recipes are loaded once and cached; a user's own private recipes are
 * cached per user. Both are dropped by invalidateRecipeIndex() (called from recipe create/update/delete routes, and
 * exported for the importer/seed) and expire after a TTL, which covers scripts that run in another process.
 */
import { prisma } from '../database.js';
import type { IndexedRecipe } from './match.js';

export const INDEX_TTL_MS = 5 * 60 * 1000;

interface Entry {
  at: number;
  recipes: IndexedRecipe[];
}

let publicCache: Entry | null = null;
let publicLoad: Promise<Entry> | null = null;
const userCache = new Map<number, Entry>();
/** bumped by every invalidation, so a load that started before one is never cached */
let version = 0;
export const USER_CACHE_MAX = 1000;

const select = {
  id: true,
  title: true,
  imageUrl: true,
  category: true,
  area: true,
  prepTime: true,
  cookTime: true,
  recipeIngredients: {
    select: { optional: true, ingredient: { select: { canonical: true, name: true } } },
  },
} as const;

type Row = {
  id: number;
  title: string;
  imageUrl: string | null;
  category: string | null;
  area: string | null;
  prepTime: number | null;
  cookTime: number | null;
  recipeIngredients: { optional: boolean; ingredient: { canonical: string; name: string } }[];
};

function toIndexed(r: Row): IndexedRecipe {
  return {
    id: r.id,
    title: r.title,
    imageUrl: r.imageUrl,
    category: r.category,
    area: r.area,
    prepTime: r.prepTime,
    cookTime: r.cookTime,
    ingredients: r.recipeIngredients.map((ri) => ({
      canonical: ri.ingredient.canonical,
      name: ri.ingredient.name,
      optional: ri.optional,
    })),
  };
}

const isFresh = (e: Entry | null | undefined): e is Entry => !!e && Date.now() - e.at < INDEX_TTL_MS;

export function invalidateRecipeIndex(): void {
  version++;
  publicCache = null;
  publicLoad = null;
  userCache.clear();
}

async function loadPublic(): Promise<IndexedRecipe[]> {
  if (isFresh(publicCache)) return publicCache.recipes;
  if (!publicLoad) {
    const p: Promise<Entry> = prisma.recipe
      .findMany({ where: { isPublic: true }, select })
      .then((rows) => ({ at: Date.now(), recipes: rows.map(toIndexed) }));
    publicLoad = p;
    p.then(
      (e) => {
        // only keep the result if nothing invalidated the index while it was loading
        if (publicLoad === p) {
          publicCache = e;
          publicLoad = null;
        }
      },
      () => {
        if (publicLoad === p) publicLoad = null;
      }
    );
  }
  return (await publicLoad).recipes;
}

async function loadOwn(userId: number): Promise<IndexedRecipe[]> {
  const hit = userCache.get(userId);
  if (isFresh(hit)) {
    // refresh recency (Map keeps insertion order)
    userCache.delete(userId);
    userCache.set(userId, hit);
    return hit.recipes;
  }
  userCache.delete(userId); // evict an expired entry
  const startedAt = version;
  const rows = await prisma.recipe.findMany({ where: { createdBy: userId, isPublic: false }, select });
  const entry = { at: Date.now(), recipes: rows.map(toIndexed) };
  if (startedAt === version) {
    userCache.set(userId, entry);
    while (userCache.size > USER_CACHE_MAX) userCache.delete(userCache.keys().next().value as number);
  }
  return entry.recipes;
}

/** All public recipes plus the user's own private ones. */
export async function getRecipesFor(userId: number): Promise<IndexedRecipe[]> {
  const [pub, own] = await Promise.all([loadPublic(), loadOwn(userId)]);
  return own.length ? [...pub, ...own] : pub;
}
