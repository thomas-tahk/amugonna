import { describe, it, expect } from 'vitest';
import { matchRecipes, mergeIngredients } from './match.js';
import type { IndexedRecipe } from './match.js';

let nextId = 1;
function recipe(title: string, ings: (string | [string, { optional?: boolean }])[], extra: Partial<IndexedRecipe> = {}): IndexedRecipe {
  return {
    id: nextId++,
    title,
    imageUrl: null,
    category: null,
    area: null,
    prepTime: null,
    cookTime: null,
    ingredients: ings.map((i) => {
      const [canonical, o] = typeof i === 'string' ? [i, {}] : i;
      return { canonical, name: canonical, optional: o.optional ?? false };
    }),
    ...extra,
  };
}

describe('matchRecipes tiers', () => {
  it('puts recipes in cookNow / oneAway / twoAway by missing count and drops the rest', () => {
    const r0 = recipe('zero', ['egg', 'rice']);
    const r1 = recipe('one', ['egg', 'rice', 'carrot']);
    const r2 = recipe('two', ['egg', 'carrot', 'celery']);
    const r3 = recipe('three', ['carrot', 'celery', 'leek']);
    const out = matchRecipes(['egg', 'rice'], [r0, r1, r2, r3]);
    expect(out.cookNow.map((m) => m.title)).toEqual(['zero']);
    expect(out.oneAway.map((m) => m.title)).toEqual(['one']);
    expect(out.twoAway.map((m) => m.title)).toEqual(['two']);
    expect(out.oneAway[0].missing).toEqual([{ name: 'Carrot', canonical: 'carrot' }]);
  });

  it('empty pantry yields nothing for 3+ ingredient recipes', () => {
    const out = matchRecipes([], [recipe('x', ['egg', 'rice', 'carrot'])]);
    expect(out).toEqual({ cookNow: [], oneAway: [], twoAway: [] });
  });
});

describe('swaps, staples, optional', () => {
  it('reports a swap with display names and keeps the recipe in its tier', () => {
    const out = matchRecipes(['onion', 'egg'], [recipe('s', ['red onion', 'egg'])]);
    expect(out.cookNow).toHaveLength(1);
    expect(out.cookNow[0].swaps).toEqual([{ need: 'Red Onion', using: 'Onion' }]);
    expect(out.cookNow[0].usedCount).toBe(2);
  });

  it('staples are never missing and are not counted', () => {
    const out = matchRecipes(['egg'], [recipe('s', ['egg', 'salt', 'water'])]);
    expect(out.cookNow[0].ingredientCount).toBe(1);
    expect(out.cookNow[0].usedCount).toBe(1);
    expect(out.cookNow[0].missing).toEqual([]);
  });

  it('a staple in the pantry is not counted as used either', () => {
    const out = matchRecipes(['egg', 'salt'], [recipe('s', ['egg', 'salt'])]);
    expect(out.cookNow[0]).toMatchObject({ ingredientCount: 1, usedCount: 1 });
  });

  it('optional ingredients never count as missing or toward counts', () => {
    const out = matchRecipes(['egg'], [recipe('s', ['egg', ['parsley', { optional: true }]])]);
    expect(out.cookNow[0]).toMatchObject({ ingredientCount: 1, usedCount: 1, missing: [] });
  });

  it('unknown (non-vocabulary) ingredients are missing and use the DB name as fallback', () => {
    const r = recipe('s', ['egg']);
    r.ingredients.push({ canonical: 'dragon fruit', name: 'Dragon Fruit', optional: false });
    const out = matchRecipes(['egg'], [r]);
    expect(out.oneAway[0].missing).toEqual([{ name: 'Dragon Fruit', canonical: 'dragon fruit' }]);
  });
});

describe('duplicate canonicals in one recipe', () => {
  it('count each canonical once', () => {
    const out = matchRecipes(['egg'], [recipe('d', ['egg', 'egg', 'carrot', 'carrot'])]);
    expect(out.oneAway[0]).toMatchObject({ ingredientCount: 2, usedCount: 1 });
    expect(out.oneAway[0].missing).toEqual([{ name: 'Carrot', canonical: 'carrot' }]);
  });
  it('are required if any copy is required', () => {
    const out = matchRecipes(['egg'], [recipe('d', ['egg', ['carrot', { optional: true }], 'carrot'])]);
    expect(out.oneAway[0].missing).toHaveLength(1);
    const opt = matchRecipes(['egg'], [recipe('o', ['egg', ['carrot', { optional: true }], ['carrot', { optional: true }]])]);
    expect(opt.cookNow[0].ingredientCount).toBe(1);
  });
  it('mergeIngredients joins measures and keeps the first name', () => {
    const merged = mergeIngredients([
      { canonical: 'butter', name: 'Butter', optional: false, measure: '1 tbsp' },
      { canonical: 'butter', name: 'Butter', optional: true, measure: '2 tbsp' },
      { canonical: 'egg', name: 'Egg', optional: false, measure: null },
    ]);
    expect(merged).toEqual([
      { canonical: 'butter', name: 'Butter', optional: false, measure: '1 tbsp + 2 tbsp' },
      { canonical: 'egg', name: 'Egg', optional: false, measure: null },
    ]);
  });
});

describe('exclusion', () => {
  it('excludes recipes with zero non-staple required ingredients', () => {
    const out = matchRecipes(['egg'], [
      recipe('only staples', ['salt', 'water']),
      recipe('only optional', [['egg', { optional: true }]]),
      recipe('none', []),
    ]);
    expect(out.cookNow).toEqual([]);
    expect(out.oneAway).toEqual([]);
  });
});

describe('counts and totalTime', () => {
  it('computes ingredientCount and usedCount', () => {
    const out = matchRecipes(['egg', 'rice'], [recipe('a', ['egg', 'rice', 'carrot', 'salt'])]);
    expect(out.oneAway[0]).toMatchObject({ ingredientCount: 3, usedCount: 2 });
  });
  it('totalTime is prep+cook when either is set, else null', () => {
    const out = matchRecipes(['egg'], [
      recipe('a', ['egg'], { prepTime: 10, cookTime: 20 }),
      recipe('b', ['egg'], { cookTime: 5 }),
      recipe('c', ['egg']),
    ]);
    const t = Object.fromEntries(out.cookNow.map((m) => [m.title, m.totalTime]));
    expect(t).toEqual({ a: 30, b: 5, c: null });
  });
});

describe('sort order within a tier', () => {
  it('fewest swaps first, then most pantry items used', () => {
    const swapper = recipe('A swapper', ['red onion', 'egg', 'rice']); // 1 swap, used 3
    const bigUse = recipe('B big', ['egg', 'rice', 'onion']); // 0 swaps, used 3
    const smallUse = recipe('C small', ['egg', 'rice']); // 0 swaps, used 2
    const out = matchRecipes(['egg', 'rice', 'onion'], [smallUse, swapper, bigUse]);
    expect(out.cookNow.map((m) => m.title)).toEqual(['B big', 'C small', 'A swapper']);
  });

  it('then fewer required ingredients, then title', () => {
    // pantry covers egg+rice: all four are oneAway with used 2
    const few = recipe('Zed few', ['egg', 'rice', 'carrot']);
    const many = recipe('Alpha many', ['egg', 'rice', 'carrot', 'salt', 'water']); // staples do not add to the count
    const a = recipe('Alpha', ['egg', 'rice', 'leek']);
    const b = recipe('Bravo', ['egg', 'rice', 'leek']);
    const out = matchRecipes(['egg', 'rice'], [b, many, few, a]);
    expect(out.oneAway.map((m) => m.title)).toEqual(['Alpha', 'Alpha many', 'Bravo', 'Zed few']);
  });

  it('more used beats fewer required', () => {
    const p = recipe('P', ['egg', 'rice', 'garlic', 'carrot']); // used 3, count 4
    const q = recipe('Q', ['egg', 'rice', 'carrot']); // used 2, count 3
    const out = matchRecipes(['egg', 'rice', 'garlic'], [q, p]);
    expect(out.oneAway.map((m) => m.title)).toEqual(['P', 'Q']);
  });
});

describe('benchmark', () => {
  it('matches 1,000 synthetic recipes in under 50 ms', () => {
    const pool = ['egg', 'rice', 'onion', 'garlic', 'chicken breast', 'pasta', 'tomato', 'cheddar', 'carrot', 'celery',
      'potato', 'leek', 'ginger', 'red onion', 'butter', 'milk', 'flour', 'beef', 'lemon', 'basil'];
    const recipes: IndexedRecipe[] = [];
    for (let i = 0; i < 1000; i++) {
      const n = 4 + (i % 8);
      const ings = Array.from({ length: n }, (_, k) => pool[(i * 7 + k * 3) % pool.length]);
      recipes.push(recipe(`R${i}`, [...new Set(ings)]));
    }
    const pantry = ['egg', 'rice', 'onion', 'garlic', 'chicken breast', 'pasta', 'tomato', 'cheddar'];
    matchRecipes(pantry, recipes.slice(0, 50)); // warm up
    const t0 = performance.now();
    const out = matchRecipes(pantry, recipes);
    const ms = performance.now() - t0;
    console.log(`matchRecipes(1000 recipes) took ${ms.toFixed(1)} ms; cookNow=${out.cookNow.length} oneAway=${out.oneAway.length} twoAway=${out.twoAway.length}`);
    expect(ms).toBeLessThan(50);
  });
});
