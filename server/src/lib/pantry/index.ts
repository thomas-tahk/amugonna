/**
 * Pantry entry helpers: parsing free text into items, and validating / applying bulk pantry changes.
 */
import type { Prisma, PrismaClient } from '@prisma/client';
import { editDistance, getEntry, resolve, suggest } from '../ingredients/index.js';
import { titleCase } from '../recipes/upsert.js';

export const MAX_BULK_ITEMS = 100;
export const MAX_ITEM_LENGTH = 80;
export const MAX_PARSE_LENGTH = 1000;

export class PantryInputError extends Error {}

export interface ParsedPiece {
  input: string;
  name: string;
  canonical: string;
  known: boolean;
}

/** An unknown phrase one or two keystrokes away from a vocabulary item ("tomatoe") is treated as that item. */
function typoFix(canonical: string) {
  if (canonical.length < 4) return undefined;
  const top = suggest(canonical, 1)[0];
  if (!top) return undefined;
  const max = canonical.length <= 5 ? 1 : 2;
  const keys = [top.canonical, ...top.synonyms];
  return keys.some((k) => editDistance(canonical, k.toLowerCase()) <= max) ? getEntry(top.canonical) : undefined;
}

export interface Piece {
  canonical: string;
  name: string;
  known: boolean;
}

/** The one place free text becomes an ingredient identity: resolve(), then typo-fix when unknown. */
export function resolvePiece(input: string): Piece | undefined {
  const r = resolve(input);
  if (!r.canonical) return undefined;
  const entry = r.known ? r.entry : typoFix(r.canonical);
  if (entry) return { canonical: entry.canonical, name: entry.name, known: true };
  return { canonical: r.canonical, name: titleCase(r.canonical), known: false };
}

/** Split free text into trimmed pieces on commas, newlines and semicolons, then " and " unless the whole piece is a known item. */
export function parsePantryText(text: string): ParsedPiece[] {
  const out: ParsedPiece[] = [];
  const seen = new Set<string>();
  const push = (input: string) => {
    const p = resolvePiece(input);
    if (!p || seen.has(p.canonical)) return;
    seen.add(p.canonical);
    out.push({ input, ...p });
  };
  for (const piece of text.split(/[,;\n\r]+/).map((s) => s.trim()).filter(Boolean)) {
    if (!/\sand\s/i.test(piece) || resolve(piece).known) {
      push(piece);
    } else {
      for (const part of piece.split(/\s+and\s+/i).map((s) => s.trim()).filter(Boolean)) push(part);
    }
  }
  return out;
}

export interface BulkChange {
  addIds: number[];
  addTexts: string[];
  removeIds: number[];
}

const MAX_ID = 2147483647; // Postgres INT4
const isId = (v: unknown): v is number => typeof v === 'number' && Number.isInteger(v) && v > 0 && v <= MAX_ID;

/** Throws PantryInputError with a caller-readable message on any invalid body. */
export function validateBulk(body: unknown): BulkChange {
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw new PantryInputError('Body must be an object with add and/or remove arrays');
  const { add, remove } = body as { add?: unknown; remove?: unknown };
  if (add !== undefined && !Array.isArray(add)) throw new PantryInputError('add must be an array');
  if (remove !== undefined && !Array.isArray(remove)) throw new PantryInputError('remove must be an array');
  const addList = (add ?? []) as unknown[];
  const removeList = (remove ?? []) as unknown[];
  if (addList.length > MAX_BULK_ITEMS || removeList.length > MAX_BULK_ITEMS) {
    throw new PantryInputError(`At most ${MAX_BULK_ITEMS} items per list`);
  }
  const addIds = new Set<number>();
  const addTexts: string[] = [];
  for (const item of addList) {
    if (typeof item === 'number') {
      if (!isId(item)) throw new PantryInputError('Ingredient ids must be positive integers');
      addIds.add(item);
    } else if (typeof item === 'string') {
      const t = item.trim();
      if (t.length < 1 || t.length > MAX_ITEM_LENGTH) throw new PantryInputError(`Ingredient text must be 1-${MAX_ITEM_LENGTH} characters`);
      addTexts.push(t);
    } else {
      throw new PantryInputError('add items must be ingredient ids (numbers) or text (strings)');
    }
  }
  const removeIds = new Set<number>();
  for (const id of removeList) {
    if (!isId(id)) throw new PantryInputError('remove items must be ingredient ids (positive integers)');
    removeIds.add(id);
  }
  return { addIds: [...addIds], addTexts, removeIds: [...removeIds] };
}

export interface ResolvedItem {
  input: string;
  ingredient: { id: number; name: string; canonical: string };
  created: boolean;
}

/** Applies a validated change inside the given transaction client. Removes run before adds. */
export async function applyBulk(tx: Prisma.TransactionClient, userId: number, change: BulkChange): Promise<ResolvedItem[]> {
  if (change.addIds.length > 0) {
    const found = await tx.ingredient.findMany({ where: { id: { in: change.addIds } }, select: { id: true } });
    const have = new Set(found.map((f) => f.id));
    const missing = change.addIds.filter((id) => !have.has(id));
    if (missing.length > 0) throw new PantryInputError(`Ingredient not found: ${missing.join(', ')}`);
  }

  const resolvedItems: ResolvedItem[] = [];
  const idsToAdd = new Set(change.addIds);
  const byCanonical = new Map<string, { id: number; name: string; canonical: string }>();
  const createdCanonicals = new Set<string>();
  const parsed = change.addTexts.map((input) => ({ input, piece: resolvePiece(input) }));
  for (const p of parsed) {
    if (!p.piece) throw new PantryInputError(`Could not understand ingredient: "${p.input}"`);
  }
  const pieces = new Map<string, Piece>();
  for (const p of parsed) pieces.set(p.piece!.canonical, p.piece!);
  // sorted so concurrent transactions take their insert locks in the same order
  const canonicals = [...pieces.keys()].sort();
  const select = { id: true, name: true, canonical: true } as const;
  if (canonicals.length > 0) {
    const rows = await tx.ingredient.findMany({ where: { canonical: { in: canonicals } }, select });
    for (const r of rows) byCanonical.set(r.canonical, r);
    for (const canonical of canonicals) {
      if (byCanonical.has(canonical)) continue;
      // ON CONFLICT DO NOTHING: a concurrent creator of the same canonical (or name) is not an error
      const base = pieces.get(canonical)!.name;
      let inserted = (await tx.ingredient.createMany({ data: [{ canonical, name: base, category: null, commonUnits: [] }], skipDuplicates: true })).count;
      let row = await tx.ingredient.findUnique({ where: { canonical }, select });
      if (!row) {
        // the name is owned by a different canonical: use a suffixed one
        inserted = (await tx.ingredient.createMany({ data: [{ canonical, name: `${base} (${canonical})`, category: null, commonUnits: [] }], skipDuplicates: true })).count;
        row = await tx.ingredient.findUnique({ where: { canonical }, select });
      }
      if (!row) throw new Error(`Could not create ingredient "${canonical}"`);
      byCanonical.set(canonical, row);
      if (inserted > 0) createdCanonicals.add(canonical);
    }
  }
  for (const p of parsed) {
    const ingredient = byCanonical.get(p.piece!.canonical)!;
    idsToAdd.add(ingredient.id);
    resolvedItems.push({ input: p.input, ingredient, created: createdCanonicals.delete(p.piece!.canonical) });
  }

  if (change.removeIds.length > 0) {
    await tx.userIngredient.deleteMany({ where: { userId, ingredientId: { in: change.removeIds } } });
  }
  if (idsToAdd.size > 0) {
    await tx.userIngredient.createMany({
      data: [...idsToAdd].map((ingredientId) => ({ userId, ingredientId })),
      skipDuplicates: true,
    });
  }
  return resolvedItems;
}

export async function loadPantry(db: PrismaClient | Prisma.TransactionClient, userId: number) {
  return db.userIngredient.findMany({
    where: { userId },
    include: { ingredient: { select: { id: true, name: true, canonical: true, category: true, commonUnits: true } } },
    orderBy: [{ addedAt: 'desc' }, { id: 'desc' }],
  });
}
