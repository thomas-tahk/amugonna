/**
 * DB writers for the recipe base. Both are idempotent.
 *  - syncVocabulary: the curated vocabulary -> `ingredients` rows
 *  - upsertRecipe:   one RecipeDto -> `recipes` + `recipe_ingredients` rows
 */
import type { PrismaClient } from '@prisma/client';
import { canonicalize, getEntry, getVocabulary } from '../ingredients/index.js';
import type { RecipeDto } from './mealdb.js';

export interface UnmatchedIngredient {
  /** name as written by the recipe source */
  name: string;
  canonical: string;
}

export interface UpsertRecipeResult {
  recipeId: number;
  created: boolean;
  /** Ingredient rows created for canonicals the DB did not have yet */
  ingredientsCreated: number;
  /** ingredients whose canonical is not in the curated vocabulary (candidates for new synonyms) */
  unmatched: UnmatchedIngredient[];
}

export function titleCase(s: string): string {
  return s.replace(/\S+/g, (w) => w.charAt(0).toUpperCase() + w.slice(1));
}

/**
 * Upsert every vocabulary entry by canonical (name, category, staple/common flags, parent, sortOrder = vocab order).
 * Rows from before the canonical column existed (canonical = lower(name)) are adopted into the vocabulary
 * when their name normalises to a vocabulary canonical, so existing pantries and recipes keep their ids.
 */
export async function syncVocabulary(prisma: PrismaClient): Promise<{ created: number; updated: number }> {
  const vocab = getVocabulary();
  const rows = await prisma.ingredient.findMany({ select: { id: true, name: true, canonical: true } });
  const byCanonical = new Map(rows.map((r) => [r.canonical, r]));
  const takenNames = new Set(rows.map((r) => r.name));

  // 1. adopt legacy rows (canonical not in the vocabulary, but the name normalises to something that is)
  for (const row of rows) {
    if (getEntry(row.canonical)) continue;
    const c = canonicalize(row.name);
    if (c === row.canonical || !getEntry(c) || byCanonical.has(c)) continue;
    await prisma.ingredient.update({ where: { id: row.id }, data: { canonical: c } });
    byCanonical.delete(row.canonical);
    byCanonical.set(c, { ...row, canonical: c });
  }

  // 2. upsert entries
  let created = 0;
  let updated = 0;
  const idByCanonical = new Map<string, number>();
  for (let i = 0; i < vocab.length; i++) {
    const e = vocab[i];
    const data = { category: e.category, isStaple: e.staple, isCommon: e.common, sortOrder: i };
    const existing = byCanonical.get(e.canonical);
    if (existing) {
      // rename to the display name unless another row already owns that name
      const rename = existing.name !== e.name && !takenNames.has(e.name) ? { name: e.name } : {};
      if (rename.name) {
        takenNames.delete(existing.name);
        takenNames.add(e.name);
      }
      await prisma.ingredient.update({ where: { id: existing.id }, data: { ...data, ...rename } });
      idByCanonical.set(e.canonical, existing.id);
      updated++;
    } else {
      // name is unique too: fall back to the canonical-suffixed name if a legacy row owns the display name
      const name = takenNames.has(e.name) ? `${e.name} (${e.canonical})` : e.name;
      const row = await prisma.ingredient.create({ data: { ...data, name, canonical: e.canonical, commonUnits: [] } });
      takenNames.add(name);
      idByCanonical.set(e.canonical, row.id);
      created++;
    }
  }

  // 3. parent links (after every row exists)
  for (const e of vocab) {
    if (!e.parent) continue;
    const parentId = idByCanonical.get(e.parent);
    if (parentId) await prisma.ingredient.update({ where: { id: idByCanonical.get(e.canonical)! }, data: { parentId } });
  }
  return { created, updated };
}

/** Idempotent by (externalSource, externalId). A re-import replaces the recipe's ingredient rows. */
export async function upsertRecipe(
  prisma: PrismaClient,
  dto: RecipeDto,
  systemUserId: number
): Promise<UpsertRecipeResult> {
  // resolve (and if needed create) ingredient rows, one per distinct canonical
  const canonicals = [...new Set(dto.ingredients.map((i) => i.canonical))];
  const found = await prisma.ingredient.findMany({
    where: { canonical: { in: canonicals } },
    select: { id: true, canonical: true },
  });
  const idByCanonical = new Map(found.map((f) => [f.canonical, f.id]));

  let ingredientsCreated = 0;
  for (const canonical of canonicals) {
    if (idByCanonical.has(canonical)) continue;
    const row = await createUnknownIngredient(prisma, canonical);
    idByCanonical.set(canonical, row);
    ingredientsCreated++;
  }

  const unmatched: UnmatchedIngredient[] = dto.ingredients
    .filter((i) => !getEntry(i.canonical))
    .map((i) => ({ name: i.name, canonical: i.canonical }));

  const fields = {
    title: dto.title,
    description: dto.description ?? null,
    instructions: dto.instructions,
    sourceUrl: dto.sourceUrl,
    sourceName: dto.sourceName,
    externalSource: dto.externalSource,
    externalId: dto.externalId,
    imageUrl: dto.imageUrl,
    images: dto.imageUrl ? [dto.imageUrl] : [],
    videoUrl: dto.videoUrl ?? null,
    category: dto.category,
    area: dto.area,
    attribution: dto.attribution,
    license: dto.license,
    tags: dto.tags,
    cuisineTypes: dto.cuisineTypes ?? (dto.area ? [dto.area] : []),
    dietaryTags: dto.dietaryTags ?? [],
    allergens: dto.allergens ?? [],
    prepTime: dto.prepTime ?? null,
    cookTime: dto.cookTime ?? null,
    difficulty: dto.difficulty ?? null,
    ...(dto.servings != null ? { servings: dto.servings } : {}),
    isPublic: true,
  };
  const rowsFor = (recipeId: number) =>
    dto.ingredients.map((i) => ({
      recipeId,
      ingredientId: idByCanonical.get(i.canonical)!,
      rawText: i.rawText,
      measure: i.measure,
      quantity: i.quantity ?? null,
      unit: i.unit ?? null,
      optional: i.optional ?? false,
      substitutions: [],
    }));

  return prisma.$transaction(async (tx) => {
    const existing = await tx.recipe.findUnique({
      where: { externalSource_externalId: { externalSource: dto.externalSource, externalId: dto.externalId } },
      select: { id: true },
    });
    let recipeId: number;
    if (existing) {
      recipeId = existing.id;
      await tx.recipe.update({ where: { id: recipeId }, data: fields });
      await tx.recipeIngredient.deleteMany({ where: { recipeId } });
    } else {
      recipeId = (await tx.recipe.create({ data: { ...fields, createdBy: systemUserId } })).id;
    }
    await tx.recipeIngredient.createMany({ data: rowsFor(recipeId) });
    return { recipeId, created: !existing, ingredientsCreated, unmatched };
  });
}

async function createUnknownIngredient(prisma: PrismaClient, canonical: string): Promise<number> {
  const name = titleCase(canonical);
  // name is unique too: suffix it if another row already owns the Title Case name
  const clash = await prisma.ingredient.findUnique({ where: { name }, select: { id: true } });
  const row = await prisma.ingredient.upsert({
    where: { canonical },
    update: {},
    create: { canonical, name: clash ? `${name} (${canonical})` : name, category: null, commonUnits: [] },
    select: { id: true },
  });
  return row.id;
}
