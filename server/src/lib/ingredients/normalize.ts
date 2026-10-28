/**
 * Ingredient normalisation: any free-text ingredient string -> one canonical ingredient.
 * Pure functions, no DB, no dependencies.
 */
import { getEntry, getVocabulary, type VocabEntry } from './vocabulary.js';

export interface Resolved {
  canonical: string;
  known: boolean;
  entry?: VocabEntry;
  /** the entry's parent family, if any (same as entry?.parent) */
  parent?: string;
}
export type SatisfyStatus = 'have' | 'swap' | 'missing' | 'staple';
export interface SatisfyResult {
  status: SatisfyStatus;
  using?: string;
}

// ---------------------------------------------------------------------------
// Word lists
// ---------------------------------------------------------------------------

/** Always dropped, even from unknown strings (preparation / size / marketing words). */
const HARD = new Set([
  'fresh', 'freshly', 'chopped', 'diced', 'minced', 'sliced', 'grated', 'shredded', 'peeled', 'deseeded',
  'seeded', 'trimmed', 'halved', 'quartered', 'cubed', 'cut', 'large', 'small', 'medium', 'big', 'jumbo',
  'organic', 'free', 'range', 'boneless', 'skinless', 'ripe', 'finely', 'roughly', 'coarsely', 'thinly',
  'thickly', 'lightly', 'good', 'quality', 'packed', 'heaped', 'level', 'rounded', 'softened', 'melted',
  'optional', 'approx', 'approximately', 'about', 'sifted', 'rinsed', 'drained', 'washed', 'torn', 'crumbled',
]);

/**
 * Ignored when a vocabulary entry matches the rest ("canned chickpeas" -> chickpea) but kept
 * in the cleaned form of unknown strings, so "canned yuzu" is not silently mangled.
 */
const SOFT = new Set([
  'canned', 'tinned', 'jarred', 'bottled', 'dried', 'dry', 'frozen', 'smoked', 'cooked', 'toasted', 'roasted',
  'raw', 'crushed', 'whole', 'plain', 'unsalted', 'salted', 'sweetened', 'unsweetened', 'lean',
  'extra', 'virgin', 'pure', 'natural', 'light', 'dark', 'baby', 'young', 'pitted', 'shelled', 'skimmed',
  'skim', 'semi', 'tin', 'can', 'jar', 'bottle', 'pack', 'packet', 'of', 'boiled', 'warm', 'cold',
]);

const NUMBER_WORDS = new Set([
  'a', 'an', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve',
  'half', 'quarter', 'couple', 'few', 'several', 'some', 'x',
]);

const VAGUE_LEADERS = new Set(['about', 'approx', 'approximately', 'around', 'roughly']);

const MEASURE_ADJ = new Set(['large', 'small', 'medium', 'big', 'heaped', 'level', 'rounded', 'generous', 'scant', 'good']);

const UNITS = new Set([
  'cup', 'cups', 'c', 'tbsp', 'tbs', 'tbl', 'tablespoon', 'tablespoons', 'tsp', 'teaspoon', 'teaspoons', 't',
  'oz', 'ounce', 'ounces', 'lb', 'lbs', 'pound', 'pounds', 'g', 'gr', 'gram', 'grams', 'gramme', 'grammes',
  'kg', 'kilo', 'kilos', 'kilogram', 'kilograms', 'mg', 'ml', 'millilitre', 'millilitres', 'milliliter',
  'milliliters', 'l', 'litre', 'litres', 'liter', 'liters', 'dl', 'cl', 'pint', 'pints', 'quart', 'quarts',
  'qt', 'gallon', 'gallons', 'fl', 'pinch', 'pinches', 'dash', 'dashes', 'splash', 'drizzle', 'handful',
  'handfuls', 'bunch', 'bunches', 'sprig', 'sprigs', 'slice', 'slices', 'piece', 'pieces', 'stick', 'sticks',
  'head', 'heads', 'clove', 'cloves', 'can', 'cans', 'tin', 'tins', 'jar', 'jars', 'bottle', 'bottles',
  'packet', 'packets', 'package', 'packages', 'pack', 'packs', 'bag', 'bags', 'box', 'boxes', 'carton',
  'cartons', 'stalk', 'stalks', 'rib', 'ribs', 'fillet', 'fillets', 'knob', 'cm', 'mm', 'inch', 'inches',
  'dozen', 'sheet', 'sheets', 'leaf', 'leaves', 'cob', 'cobs', 'rasher', 'rashers',
]);
/** One-letter units are only units straight after a number ("2 c flour", never "c"). */
const SHORT_UNITS = new Set(['c', 't', 'l', 'g']);

/** Everything from these words onward is not part of the ingredient name. */
const CUT_WORDS = new Set(['for', 'to', 'plus', 'in', 'as', 'if', 'such', 'with', 'from', 'per']);

/** Units that mean "a spice-sized amount": "1/2 tsp pepper" is black pepper, "2 peppers" is not. */
const SPICE_UNITS = new Set([
  'tsp', 'teaspoon', 'teaspoons', 'tbsp', 'tbs', 'tbl', 'tablespoon', 'tablespoons', 'pinch', 'pinches', 'dash',
  'dashes', 'g', 'gr', 'gram', 'grams', 'gramme', 'grammes', 'mg', 't',
]);

// ---------------------------------------------------------------------------
// Singularising
// ---------------------------------------------------------------------------

const SING_IRREGULAR: Record<string, string> = {
  chillies: 'chilli',
  chilies: 'chili',
  leaves: 'leaf',
  loaves: 'loaf',
  halves: 'half',
  knives: 'knife',
  cookies: 'cookie',
  brownies: 'brownie',
  smoothies: 'smoothie',
  veggies: 'veggie',
  calories: 'calorie',
};
const SING_KEEP = new Set([
  'hummus', 'couscous', 'asparagus', 'molasses', 'swiss', 'citrus', 'watercress', 'cress', 'lemongrass', 'bass',
  'grits', 'series', 'species', 'plus', 'this', 'less', 'hass', 'cos', 'tahini', 'pitta',
  'houmous', 'harissa', 'ras', 'bonus', 'octopus', 'gas', 'pasta',
]);

function singularize(w: string): string {
  if (w.length <= 3) return w;
  const irregular = SING_IRREGULAR[w];
  if (irregular) return irregular;
  if (SING_KEEP.has(w)) return w;
  if (!w.endsWith('s')) return w;
  if (w.endsWith('ss') || w.endsWith('us') || w.endsWith('is')) return w;
  if (w.endsWith('ies')) return w.length > 4 ? `${w.slice(0, -3)}y` : w.slice(0, -1);
  if (w.endsWith('oes') && w.length > 5) return w.slice(0, -2);
  if (/(ches|shes|xes|zes|sses)$/.test(w)) return w.slice(0, -2);
  return w.slice(0, -1);
}

// ---------------------------------------------------------------------------
// Text cleaning
// ---------------------------------------------------------------------------

function stripAccents(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '');
}

const isNumeric = (t: string): boolean => /\d/.test(t) && /^[\d.,/\-–]+$/.test(t);

interface Leading {
  tokens: string[];
  /** last unit word consumed ("tsp", "cloves"), if any */
  unit?: string;
  hasNumber: boolean;
}

/** Drop leading quantities, units and filler ("2 1/2 cups", "a pinch of", "1 x 400g tin of"). */
function stripLeading(tokens: string[]): Leading {
  let i = 0;
  let consumed = false; // consumed something numeric / quantity-ish already
  let hasNumber = false;
  let unit: string | undefined;
  const n = tokens.length;
  while (i < n - 1) {
    const raw = tokens[i];
    const t = raw.replace(/\.+$/, '');
    if (isNumeric(t)) {
      i++;
      consumed = true;
      hasNumber = true;
    } else if (VAGUE_LEADERS.has(t)) {
      i++;
    } else if (NUMBER_WORDS.has(t) && !(t === 'half' && tokens[i + 1] === 'and')) {
      i++;
      consumed = true;
      if (t !== 'a' && t !== 'an' && t !== 'some' && t !== 'few' && t !== 'several' && t !== 'couple') hasNumber = true;
    } else if (consumed && (t === 'of' || t === 'or' || t === 'to')) {
      i++;
    } else if (consumed && MEASURE_ADJ.has(t) && i + 1 < n && (UNITS.has(tokens[i + 1].replace(/\.+$/, '')) || tokens[i + 1] === 'of')) {
      i++;
    } else if (consumed && UNITS.has(t) && !(SHORT_UNITS.has(t) && !isNumeric(tokens[i - 1] ?? ''))) {
      unit = t;
      i++;
    } else {
      break;
    }
  }
  return { tokens: tokens.slice(i), unit, hasNumber };
}

interface Prepared {
  tokens: string[];
  unit?: string;
  hasNumber: boolean;
  pluralPepper: boolean;
}

function preprocess(raw: string): Prepared {
  let s = stripAccents(raw).toLowerCase();
  s = s.replace(/[\u00bc\u00bd\u00be\u2150-\u215e]/g, ' 1/2 ');
  s = s.replace(/\([^)]*\)|\[[^\]]*\]/g, ' ');
  // "2 boneless, skinless chicken breasts": a comma after a plain descriptor is not a suffix cut
  s = s.replace(/\b(boneless|skinless|large|small|medium|fresh|ripe|organic|dried|frozen|canned|tinned)\s*,/g, '$1 ');
  const comma = s.indexOf(',');
  if (comma >= 0) {
    s = /[a-z]/.test(s.slice(0, comma)) ? s.slice(0, comma) : s.replace(/,/g, ' ');
  }
  s = s.replace(/&/g, ' and ').replace(/['\u2019`]/g, '');
  s = s.replace(/(\d)([a-z])/g, '$1 $2').replace(/([a-z])(\d)/g, '$1 $2');
  const pluralPepper = /\bpeppers\b/.test(s);
  // "juice of 2 lemons" -> "lemons juice"
  const jz = /^\s*(juice|zest|rind)\s+of\s+(.*)$/.exec(s);
  let lead: Leading;
  if (jz) {
    const rest = stripLeading(jz[2].split(/\s+/).filter(Boolean));
    lead = { ...rest, tokens: [...rest.tokens, jz[1]] };
  } else {
    lead = stripLeading(s.split(/\s+/).filter(Boolean));
  }
  s = lead.tokens.join(' ');
  s = s.replace(/\b(?:low|reduced|non|full|zero)[\s-]fat\b|\bfat[\s-]free\b/g, ' ');
  s = s.replace(/\b(?:bone|skin)[\s-](?:in|on)\b/g, ' ');
  s = s.replace(/[^a-z\s]/g, ' ');
  const words = s.split(/\s+/).filter(Boolean);
  const cut = words.findIndex((w, idx) => idx > 0 && CUT_WORDS.has(w));
  return {
    tokens: (cut >= 0 ? words.slice(0, cut) : words).map(singularize),
    unit: lead.unit,
    hasNumber: lead.hasNumber,
    pluralPepper,
  };
}

// ---------------------------------------------------------------------------
// Index
// ---------------------------------------------------------------------------

/** Normalised key for a vocabulary phrase: same pipeline as user text, minus unit stripping. */
function keyOf(phrase: string): string {
  return stripAccents(phrase)
    .toLowerCase()
    .replace(/['’`]/g, '')
    .replace(/[^a-z\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
    .map(singularize)
    .join(' ');
}

interface Index {
  byKey: Map<string, VocabEntry>;
  collisions: string[];
  maxSpan: number;
}

function buildIndex(): Index {
  const byKey = new Map<string, VocabEntry>();
  const collisions: string[] = [];
  let maxSpan = 1;
  const add = (phrase: string, entry: VocabEntry, isCanonical: boolean) => {
    const key = keyOf(phrase);
    if (!key) return;
    const existing = byKey.get(key);
    if (existing && existing !== entry) {
      collisions.push(`"${phrase}" (${entry.canonical}) collides with ${existing.canonical}`);
      if (!isCanonical) return;
    }
    byKey.set(key, entry);
    maxSpan = Math.max(maxSpan, key.split(' ').length);
  };
  const vocab = getVocabulary();
  for (const e of vocab) add(e.canonical, e, true);
  for (const e of vocab) {
    add(e.name, e, false);
    for (const s of e.synonyms) add(s, e, false);
  }
  return { byKey, collisions, maxSpan };
}

let cachedIndex: Index | undefined;
const index = (): Index => (cachedIndex ??= buildIndex());

/** Test hook: phrases that map to two different entries (should always be empty). */
export function indexCollisions(): string[] {
  return [...index().collisions];
}

// ---------------------------------------------------------------------------
// canonicalize / resolve
// ---------------------------------------------------------------------------

function matchTokens(tokens: string[]): VocabEntry | undefined {
  const { byKey, maxSpan } = index();
  const n = tokens.length;
  for (let len = Math.min(n, maxSpan); len >= 1; len--) {
    for (let start = n - len; start >= 0; start--) {
      const entry = byKey.get(tokens.slice(start, start + len).join(' '));
      if (!entry) continue;
      const leftoverOk = tokens.every(
        (t, i) => (i >= start && i < start + len) || HARD.has(t) || SOFT.has(t),
      );
      if (leftoverOk) return entry;
    }
  }
  return undefined;
}

const cache = new Map<string, Resolved>();
const CACHE_MAX = 5000;

function unknownResult(tokens: string[]): Resolved {
  const kept = tokens.filter((t) => !HARD.has(t));
  return { canonical: (kept.length > 0 ? kept : tokens).join(' '), known: false };
}

function knownResult(entry: VocabEntry): Resolved {
  return { canonical: entry.canonical, known: true, entry, parent: entry.parent };
}

function resolvePrepared(p: Prepared): Resolved {
  let tokens = p.tokens;

  // Lists of staples: "salt and pepper", "salt & freshly ground black pepper" -> salt
  if (tokens.includes('and')) {
    const parts: string[][] = [[]];
    for (const t of tokens) {
      if (t === 'and') parts.push([]);
      else parts[parts.length - 1].push(t);
    }
    const nonEmpty = parts.filter((x) => x.length > 0);
    if (nonEmpty.length > 1) {
      const rs = nonEmpty.map((pt) => resolvePrepared({ tokens: pt, hasNumber: false, pluralPepper: false }));
      if (rs.every((r) => r.entry?.staple)) return rs[0];
    }
  }

  // "chicken or vegetable broth": if there is more than one word after "or", the head
  // noun is shared ("chicken broth"); otherwise keep the first alternative only.
  const orIdx = tokens.indexOf('or');
  if (orIdx > 0 && orIdx < tokens.length - 1) {
    const left = tokens.slice(0, orIdx);
    const right = tokens.slice(orIdx + 1);
    if (right.length >= 2) {
      const shared = resolvePrepared({ ...p, tokens: [...left, right[right.length - 1]] });
      if (shared.known) return shared;
    }
    tokens = left;
  } else if (orIdx === 0 || orIdx === tokens.length - 1) {
    tokens = tokens.filter((t) => t !== 'or');
  }

  // "pepper" is ambiguous: spice-sized amounts / bare / "to taste" are black pepper,
  // counted or plural ones are bell peppers, "1/2 tsp red pepper" is chilli flakes.
  const core = tokens.filter((t) => !HARD.has(t));
  const spice = p.unit !== undefined && SPICE_UNITS.has(p.unit);
  if (core.length === 1 && core[0] === 'pepper') {
    const bell = !spice && (p.hasNumber || p.pluralPepper);
    const e = getEntry(bell ? 'bell pepper' : 'black pepper');
    if (e) return knownResult(e);
  } else if (core.length === 2 && core[0] === 'red' && core[1] === 'pepper' && spice) {
    const e = getEntry('chilli flake');
    if (e) return knownResult(e);
  }

  const entry = matchTokens(tokens);
  return entry ? knownResult(entry) : unknownResult(tokens);
}

export function resolve(raw: string): Resolved {
  const cached = cache.get(raw);
  if (cached) return cached;
  // A string that is exactly a vocabulary phrase wins before any quantity stripping
  // ("five spice" starts with a number word). Plural "peppers" needs the pepper rules.
  const direct =
    /\d/.test(raw) || /\bpeppers\b/i.test(raw) ? undefined : index().byKey.get(keyOf(raw));
  const result = direct ? knownResult(direct) : resolvePrepared(preprocess(raw));
  if (cache.size >= CACHE_MAX) cache.clear();
  cache.set(raw, result);
  return result;
}

export function canonicalize(raw: string): string {
  return resolve(raw).canonical;
}

// ---------------------------------------------------------------------------
// suggest (type-ahead)
// ---------------------------------------------------------------------------

/** Damerau-Levenshtein (optimal string alignment). */
export function editDistance(a: string, b: string): number {
  const al = a.length;
  const bl = b.length;
  if (al === 0) return bl;
  if (bl === 0) return al;
  const d: number[][] = Array.from({ length: al + 1 }, (_, i) => {
    const row = new Array<number>(bl + 1).fill(0);
    row[0] = i;
    return row;
  });
  for (let j = 0; j <= bl; j++) d[0][j] = j;
  for (let i = 1; i <= al; i++) {
    for (let j = 1; j <= bl; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
      }
    }
  }
  return d[al][bl];
}

interface SuggestKeys {
  entry: VocabEntry;
  canon: string;
  syns: string[];
}

let suggestKeys: SuggestKeys[] | undefined;
const plain = (s: string): string =>
  stripAccents(s).toLowerCase().replace(/['’`]/g, '').replace(/[^a-z0-9%\s]/g, ' ').replace(/\s+/g, ' ').trim();

function getSuggestKeys(): SuggestKeys[] {
  return (suggestKeys ??= getVocabulary().map((entry) => ({
    entry,
    canon: plain(entry.canonical),
    syns: entry.synonyms.map(plain),
  })));
}

const startsWord = (key: string, q: string): boolean => key.startsWith(q) || key.includes(` ${q}`);

function scoreEntry(k: SuggestKeys, queries: string[], exactEntry: VocabEntry | undefined): { tier: number; dist: number } {
  if (exactEntry === k.entry) return { tier: 0, dist: 0 };
  let tier = Infinity;
  for (const q of queries) {
    if (k.canon === q || k.syns.includes(q)) tier = Math.min(tier, 0);
    else if (k.canon.startsWith(q)) tier = Math.min(tier, 1);
    else if (startsWord(k.canon, q)) tier = Math.min(tier, 2);
    else if (k.canon.includes(q)) tier = Math.min(tier, 3);
    else if (k.syns.some((s) => s.startsWith(q))) tier = Math.min(tier, 4);
    else if (k.syns.some((s) => s.includes(q))) tier = Math.min(tier, 5);
  }
  if (tier !== Infinity) return { tier, dist: 0 };

  // fuzzy: typo anywhere, or typo in a partially typed word
  const q = queries[queries.length - 1];
  if (q.length < 4) return { tier: Infinity, dist: Infinity };
  const maxDist = q.length <= 5 ? 1 : 2;
  let best = Infinity;
  // matches via a synonym count slightly worse than via the canonical name
  const keys: [string, number][] = [[k.canon, 0], ...k.syns.map((s): [string, number] => [s, 0.5])];
  for (const [key, penalty] of keys) {
    best = Math.min(best, editDistance(q, key) + penalty);
    if (key.length > q.length) best = Math.min(best, editDistance(q, key.slice(0, q.length)) + penalty);
    for (const word of key.split(' ')) {
      if (word.length >= 4) best = Math.min(best, editDistance(q, word) + penalty);
    }
  }
  return best <= maxDist ? { tier: 6, dist: best } : { tier: Infinity, dist: Infinity };
}

/**
 * Ranked vocabulary entries for type-ahead.
 * Order: exact > canonical prefix > canonical word-prefix > canonical substring >
 * synonym prefix > synonym substring > fuzzy (typos).
 */
export function suggest(query: string, limit = 8): VocabEntry[] {
  const q = plain(query);
  if (!q || limit <= 0) return [];
  const qSing = q.split(' ').map(singularize).join(' ');
  const queries = qSing === q ? [q] : [q, qSing];
  const exactEntry = index().byKey.get(keyOf(q));
  const scored = getSuggestKeys()
    .map((k) => ({ k, ...scoreEntry(k, queries, exactEntry) }))
    .filter((s) => s.tier !== Infinity);
  scored.sort(
    (a, b) =>
      a.tier - b.tier ||
      a.dist - b.dist ||
      Number(b.k.entry.common) - Number(a.k.entry.common) ||
      a.k.canon.length - b.k.canon.length ||
      a.k.canon.localeCompare(b.k.canon),
  );
  return scored.slice(0, limit).map((s) => s.k.entry);
}

// ---------------------------------------------------------------------------
// satisfies
// ---------------------------------------------------------------------------

function toCanonical(s: string): string {
  return getEntry(s) ? s : canonicalize(s);
}

/**
 * Can this pantry cover this recipe ingredient?
 * have: exact, a child of the requirement, a maker (egg for yolk), or a generic parent.
 * then staple, then swap: a non-generic parent or a sibling. A staple is reported as 'staple' even if
 * only a sibling is owned (any oil will do).
 */
export function satisfies(pantry: Iterable<string>, required: string): SatisfyResult {
  const have = [...new Set([...pantry].map(toCanonical).filter(Boolean))];
  const req = toCanonical(required);
  if (!req) return { status: 'missing' };

  if (have.includes(req)) return { status: 'have', using: req };

  const entry = getEntry(req);
  if (!entry) return { status: 'missing' };

  // a more specific item in the pantry covers the general requirement
  const child = have.find((p) => getEntry(p)?.parent === entry.canonical);
  if (child) return { status: 'have', using: child };

  // entries that are made from another (egg -> egg yolk, lemon -> lemon zest)
  const maker = entry.satisfiedBy?.find((c) => have.includes(c));
  if (maker) return { status: 'have', using: maker };

  // the general item in the pantry: fully covers only if the family is generic
  const parent = entry.parent ? getEntry(entry.parent) : undefined;
  if (parent && have.includes(parent.canonical) && parent.generic) {
    return { status: 'have', using: parent.canonical };
  }

  if (entry.staple) return { status: 'staple' };

  if (parent && have.includes(parent.canonical)) return { status: 'swap', using: parent.canonical };

  if (entry.parent) {
    const sibling = have.find((p) => p !== req && getEntry(p)?.parent === entry.parent);
    if (sibling) return { status: 'swap', using: sibling };
  }
  return { status: 'missing' };
}
