import type { Prisma, PrismaClient } from '@prisma/client';
import { canonicalize } from '../ingredients/index.js';
import { invalidateRecipeIndex } from '../matching/index.js';
import type { RecipeDraft } from './parse.js';
import { ingredientMeasure } from './measure.js';

export async function savePrivateRecipe(prisma: PrismaClient, userId: number, draft: RecipeDraft): Promise<number> {
  const id = await prisma.$transaction(async tx => {
    const ingredients = await resolveIngredients(tx, draft.ingredients);
    const recipe = await tx.recipe.create({
      data: {
        title: draft.title,
        koreanTitle: draft.koreanTitle || null,
        description: draft.description || null,
        instructions: draft.instructions,
        sourceUrl: draft.sourceUrl || null,
        sourceName: draft.sourceName || null,
        prepTime: draft.prepTime,
        cookTime: draft.cookTime,
        servings: draft.servings,
        cuisineTypes: draft.cuisineTypes,
        isPublic: false,
        createdBy: userId,
        recipeIngredients: { create: ingredients.map(ingredient => ({ ...ingredient, quantity: null, unit: null, optional: false, substitutions: [] })) },
      },
      select: { id: true },
    });
    return recipe.id;
  });
  invalidateRecipeIndex();
  return id;
}

async function resolveIngredients(tx: Prisma.TransactionClient, lines: string[]) {
  const resolved = lines.map(rawText => ({ rawText, canonical: canonicalize(rawText), measure: ingredientMeasure(rawText) }));
  const unique = [...new Set(resolved.map(item => item.canonical))];
  const known = await tx.ingredient.findMany({ where: { canonical: { in: unique } }, select: { id: true, canonical: true } });
  const idByCanonical = new Map(known.map(item => [item.canonical, item.id]));
  for (const canonical of unique) {
    if (idByCanonical.has(canonical)) continue;
    const title = canonical.replace(/\b\w/g, letter => letter.toUpperCase());
    const clash = await tx.ingredient.findUnique({ where: { name: title }, select: { id: true } });
    const ingredient = await tx.ingredient.upsert({
      where: { canonical },
      update: {},
      create: { canonical, name: clash ? `${title} (${canonical})` : title, category: null, commonUnits: [] },
      select: { id: true },
    });
    idByCanonical.set(canonical, ingredient.id);
  }
  return resolved.map(item => ({ ingredientId: idByCanonical.get(item.canonical)!, rawText: item.rawText, measure: item.measure }));
}
