import { describe, expect, it } from 'vitest';
import {
  CATEGORIES,
  canonicalize,
  getCommon,
  getVocabulary,
  resolve,
  satisfies,
  suggest,
} from './index.js';
import { indexCollisions } from './normalize.js';

const table = (rows: [string, string][]) => rows;

describe('canonicalize: plurals and case', () => {
  it.each(
    table([
      ['Eggs', 'egg'],
      ['egg', 'egg'],
      ['EGGS', 'egg'],
      ['tomatoes', 'tomato'],
      ['Tomatoes', 'tomato'],
      ['potatoes', 'potato'],
      ['Bell Peppers', 'bell pepper'],
      ['Carrots', 'carrot'],
      ['Lemons', 'lemon'],
      ['blueberries', 'blueberry'],
      ['bay leaves', 'bay leaf'],
      ['red chillies', 'red chilli'],
      ['Mushrooms', 'mushroom'],
    ]),
  )('%s -> %s', (raw, want) => {
    expect(canonicalize(raw)).toBe(want);
  });

  it('does not break words that merely end in s', () => {
    expect(canonicalize('hummus')).toBe('hummus');
    expect(canonicalize('couscous')).toBe('couscous');
    expect(canonicalize('asparagus')).toBe('asparagus');
    expect(canonicalize('molasses')).toBe('treacle');
    expect(canonicalize('Swiss cheese')).toBe('swiss cheese');
    expect(canonicalize('lemongrass')).toBe('lemongrass');
    expect(canonicalize('watercress')).toBe('watercress');
  });
});

describe('canonicalize: quantities, units, quantities glued to units', () => {
  it.each(
    table([
      ['2 large eggs', 'egg'],
      ['2 1/2 cups all-purpose flour', 'all-purpose flour'],
      ['400g chicken breast', 'chicken breast'],
      ['400g can chopped tomatoes', 'chopped tomato'],
      ['1 tbsp olive oil', 'olive oil'],
      ['1 Tbsp. olive oil', 'olive oil'],
      ['a pinch of salt', 'salt'],
      ['½ cup sugar', 'sugar'],
      ['1½ tsp cumin', 'cumin'],
      ['2-3 cloves garlic', 'garlic'],
      ['3 cloves of garlic', 'garlic'],
      ['250ml milk', 'milk'],
      ['1.5kg potatoes', 'potato'],
      ['1 x 400g tin chickpeas', 'chickpea'],
      ['A handful of fresh basil', 'basil'],
      ['2 sprigs fresh thyme', 'thyme'],
      ['half a lemon', 'lemon'],
      ['one onion', 'onion'],
      ['8 oz. ground beef', 'ground beef'],
      ['2 tablespoons soy sauce', 'soy sauce'],
      ['juice of 1 lemon', 'lemon juice'],
      ['2cm piece of ginger', 'ginger'],
    ]),
  )('%s -> %s', (raw, want) => {
    expect(canonicalize(raw)).toBe(want);
  });

  it('keeps a bare "cloves" as the spice', () => {
    expect(canonicalize('cloves')).toBe('clove');
    expect(canonicalize('1 tsp ground cloves')).toBe('clove');
  });
});

describe('canonicalize: parentheticals, commas, descriptors', () => {
  it.each(
    table([
      ['garlic, minced', 'garlic'],
      ['2 onions, finely chopped', 'onion'],
      ['butter (softened)', 'butter'],
      ['1 cup flour (about 120g), sifted', 'flour'],
      ['fresh parsley, roughly chopped', 'parsley'],
      ['Free-range Eggs', 'egg'],
      ['boneless skinless chicken breast', 'chicken breast'],
      ['2 boneless, skinless chicken breasts', 'chicken breast'],
      ['organic ripe medium tomatoes', 'tomato'],
      ['finely diced red onion', 'red onion'],
      ['grated parmesan', 'parmesan'],
      ['Extra Virgin Olive Oil', 'olive oil'],
      ['lean minced beef', 'ground beef'],
      ['dried oregano', 'oregano'],
      ['frozen peas', 'pea'],
      ['canned chickpeas', 'chickpea'],
      ['tinned tuna', 'tuna'],
      ['salt to taste', 'salt'],
      ['oil for frying', 'cooking oil'],
      ['butter or margarine', 'butter'],
    ]),
  )('%s -> %s', (raw, want) => {
    expect(canonicalize(raw)).toBe(want);
  });
});

describe('canonicalize: synonyms and UK/US names', () => {
  it.each(
    table([
      ['scallions', 'green onion'],
      ['scallion', 'green onion'],
      ['Spring Onions', 'green onion'],
      ['spring onion', 'green onion'],
      ['green onions', 'green onion'],
      ['coriander', 'cilantro'],
      ['Coriander', 'cilantro'],
      ['fresh coriander leaves', 'cilantro'],
      ['cilantro', 'cilantro'],
      ['ground coriander', 'coriander seed'],
      ['coriander seeds', 'coriander seed'],
      ['aubergine', 'eggplant'],
      ['courgettes', 'zucchini'],
      ['minced beef', 'ground beef'],
      ['beef mince', 'ground beef'],
      ['Double Cream', 'heavy cream'],
      ['heavy cream', 'heavy cream'],
      ['Plain Flour', 'all-purpose flour'],
      ['All-Purpose Flour', 'all-purpose flour'],
      ['Self-raising Flour', 'self-raising flour'],
      ['self rising flour', 'self-raising flour'],
      ['Caster Sugar', 'caster sugar'],
      ['icing sugar', 'icing sugar'],
      ['powdered sugar', 'icing sugar'],
      ['cornflour', 'cornstarch'],
      ['bicarbonate of soda', 'baking soda'],
      ['capsicum', 'bell pepper'],
      ['rocket', 'arugula'],
      ['prawns', 'prawn'],
      ['shrimp', 'prawn'],
      ['Chicken Broth', 'chicken stock'],
      ['Chicken Stock', 'chicken stock'],
      ['chicken stock cube', 'chicken stock'],
      ['Unsalted Butter', 'butter'],
      ['Red Chilli', 'red chilli'],
      ['chili pepper', 'chilli'],
      ['Garam Masala', 'garam masala'],
      ['Coconut Milk', 'coconut milk'],
      ['Soy Sauce', 'soy sauce'],
      ['pepper', 'black pepper'],
      ['freshly ground black pepper', 'black pepper'],
      ['sea salt', 'salt'],
      ['Salmon Fillet', 'salmon'],
    ]),
  )('%s -> %s', (raw, want) => {
    expect(canonicalize(raw)).toBe(want);
  });
});

describe('canonicalize: tomato family and longest match', () => {
  it.each(
    table([
      ['canned diced tomatoes', 'chopped tomato'],
      ['Chopped Tomatoes', 'chopped tomato'],
      ['400g tin chopped tomatoes', 'chopped tomato'],
      ['cherry tomatoes', 'cherry tomato'],
      ['passata', 'passata'],
      ['tomato puree', 'tomato paste'],
      ['tomatoes', 'tomato'],
      // longest vocabulary match wins over the shorter head word
      ['chicken breast', 'chicken breast'],
      ['chicken', 'chicken'],
      ['coconut milk', 'coconut milk'],
      ['milk', 'milk'],
      ['almond milk', 'almond milk'],
      ['peanut butter', 'peanut butter'],
      ['butter', 'butter'],
      ['butter beans', 'butter bean'],
      ['red wine vinegar', 'red wine vinegar'],
      ['red wine', 'red wine'],
      ['sweet potato', 'sweet potato'],
      ['cream cheese', 'cream cheese'],
      ['sour cream', 'sour cream'],
      ['smoked paprika', 'smoked paprika'],
      ['paprika', 'paprika'],
      ['red pepper flakes', 'chilli flake'],
      ['bell pepper', 'bell pepper'],
    ]),
  )('%s -> %s', (raw, want) => {
    expect(canonicalize(raw)).toBe(want);
  });

  it('canned tomatoes and passata are separate roots, not tomato children', () => {
    expect(resolve('canned diced tomatoes').parent).toBeUndefined();
    expect(resolve('passata').parent).toBeUndefined();
    expect(resolve('cherry tomatoes').parent).toBe('tomato');
  });
});

describe('canonicalize: reviewer fixes (round 2)', () => {
  it.each(
    table([
      // 1. "X or Y noun"
      ['1 cup chicken or vegetable broth', 'chicken stock'],
      ['2 cups beef or chicken stock', 'beef stock'],
      ['olive or vegetable oil', 'olive oil'],
      ['butter or margarine', 'butter'],
      ['1 or 2 cloves garlic', 'garlic'],
      // 3. cooked / ground
      ['cooked chicken', 'cooked chicken'],
      ['roast chicken', 'cooked chicken'],
      ['ground pork', 'ground pork'],
      ['ground chicken', 'ground chicken'],
      // 4. "ground" is no longer a throwaway word
      ['ground mustard', 'mustard powder'],
      ['ground red pepper', 'cayenne pepper'],
      ['ground fennel', 'ground fennel'],
      ['fennel seeds', 'fennel seed'],
      ['ground rice', 'ground rice'],
      ['ground cumin', 'cumin'],
      ['ground cinnamon', 'cinnamon'],
      ['ground black pepper', 'black pepper'],
      ['ground pepper', 'black pepper'],
      ['ground almonds', 'ground almond'],
      // 5. pepper
      ['2 peppers, sliced', 'bell pepper'],
      ['1 pepper, diced', 'bell pepper'],
      ['peppers', 'bell pepper'],
      ['pepper', 'black pepper'],
      ['pepper to taste', 'black pepper'],
      ['1/2 tsp pepper', 'black pepper'],
      ['1 pinch of pepper', 'black pepper'],
      ['1/2 tsp red pepper', 'chilli flake'],
      ['red pepper', 'red bell pepper'],
      ['2 red peppers', 'red bell pepper'],
      // 6. bad synonyms gone
      ['pimento', 'pimento'],
      ['whipped cream', 'whipped cream'],
      // 7. staple lines
      ['salt and pepper to taste', 'salt'],
      ['Salt & freshly ground black pepper', 'salt'],
      ['salt and pepper', 'salt'],
      ['mac and cheese', 'mac and cheese'],
      // 8. nits
      ['bone-in chicken thighs', 'chicken thigh'],
      ['skin-on chicken thighs', 'chicken thigh'],
      ['half and half', 'single cream'],
      ['1 cup half-and-half', 'single cream'],
      ['1 tsp onion powder', 'onion powder'],
      ['zest of 1 lemon', 'lemon zest'],
      ['orange zest', 'orange zest'],
      ['cake flour', 'cake flour'],
      ['evaporated milk', 'evaporated milk'],
      ['garlic salt', 'garlic salt'],
      ['sun-dried tomatoes', 'sun dried tomato'],
      ['snow peas', 'snow pea'],
      ['grapeseed oil', 'grapeseed oil'],
      ['corn oil', 'corn oil'],
      ['avocado oil', 'avocado oil'],
      ['peanut oil', 'peanut oil'],
      ['canola oil', 'canola oil'],
    ]),
  )('%s -> %s', (raw, want) => {
    expect(canonicalize(raw)).toBe(want);
  });

  it('resolve exposes parent at the top level', () => {
    expect(resolve('chicken breast').parent).toBe('chicken');
    expect(resolve('chicken').parent).toBeUndefined();
    expect(resolve('yuzu kosho').parent).toBeUndefined();
  });

  it('suggest("corn") does not surface gherkin in the top 5', () => {
    expect(suggest('corn', 5).map((e) => e.canonical)).not.toContain('gherkin');
    expect(suggest('corn')[0].canonical).toBe('corn');
  });
});

describe('satisfies: reviewer fixes (round 2)', () => {
  // [pantry, required, expected status, expected using]
  it.each([
    // forms are not children
    [['lemon juice'], 'lemon', 'missing', undefined],
    [['lemon'], 'lemon juice', 'missing', undefined],
    [['lime juice'], 'lime', 'missing', undefined],
    [['orange juice'], 'orange', 'missing', undefined],
    [['passata'], 'tomato', 'missing', undefined],
    [['tomato'], 'passata', 'missing', undefined],
    [['tomato'], 'chopped tomato', 'missing', undefined],
    [['chopped tomato'], 'tomato', 'missing', undefined],
    [['passata'], 'chopped tomato', 'missing', undefined],
    [['smoked salmon'], 'salmon', 'missing', undefined],
    [['salmon'], 'smoked salmon', 'missing', undefined],
    [['desiccated coconut'], 'coconut', 'missing', undefined],
    [['ground almond'], 'almond', 'missing', undefined],
    [['cinnamon stick'], 'cinnamon', 'missing', undefined],
    [['cinnamon'], 'cinnamon stick', 'missing', undefined],
    // eggs cover yolk/white; yolk/white do not cover a whole egg
    [['egg'], 'egg yolk', 'have', 'egg'],
    [['egg'], 'egg white', 'have', 'egg'],
    [['egg white'], 'egg', 'missing', undefined],
    [['egg yolk'], 'egg', 'missing', undefined],
    // zest needs the fruit
    [['lemon'], 'lemon zest', 'have', 'lemon'],
    [['orange'], 'orange zest', 'have', 'orange'],
    [['lemon juice'], 'lemon zest', 'missing', undefined],
    // parent in pantry for a child requirement is a swap...
    [['sugar'], 'icing sugar', 'swap', 'sugar'],
    [['flour'], 'self-raising flour', 'swap', 'flour'],
    [['cheese'], 'parmesan', 'swap', 'cheese'],
    [['onion'], 'red onion', 'swap', 'onion'],
    // ...except generic parents
    [['chicken'], 'chicken breast', 'have', 'chicken'],
    [['rice'], 'basmati rice', 'have', 'rice'],
    [['pasta'], 'spaghetti', 'have', 'pasta'],
    [['bell pepper'], 'red bell pepper', 'have', 'bell pepper'],
    [['mushroom'], 'shiitake mushroom', 'have', 'mushroom'],
    // child in pantry for parent requirement stays have
    [['chicken thigh'], 'chicken', 'have', 'chicken thigh'],
    [['parmesan'], 'cheese', 'have', 'parmesan'],
    // ground meats are their own roots
    [['beef steak'], 'ground beef', 'missing', undefined],
    [['steak'], 'ground beef', 'missing', undefined],
    [['ground beef'], 'beef steak', 'missing', undefined],
    [['chicken breast'], 'ground chicken', 'missing', undefined],
    [['ground chicken'], 'chicken breast', 'missing', undefined],
    [['ground pork'], 'pork shoulder', 'missing', undefined],
    [['ground turkey'], 'ground beef', 'missing', undefined],
    [['cooked chicken'], 'chicken', 'missing', undefined],
    // chicken cuts stay siblings
    [['chicken wing'], 'chicken drumstick', 'swap', 'chicken wing'],
    // staple lines
    [[], 'salt and pepper to taste', 'staple', undefined],
    [[], 'Salt & freshly ground black pepper', 'staple', undefined],
    [[], 'salt and pepper', 'staple', undefined],
    [[], '1 pepper', 'missing', undefined],
    [['bell pepper'], '2 peppers, sliced', 'have', 'bell pepper'],
    // x-or-y lines never collapse to the bare generic
    [['chicken'], '1 cup chicken or vegetable broth', 'missing', undefined],
    [['chicken stock'], '1 cup chicken or vegetable broth', 'have', 'chicken stock'],
    [[], 'olive oil', 'staple', undefined],
  ] as [string[], string, string, string | undefined][])('%j + %s -> %s', (pantry, required, status, using) => {
    const r = satisfies(pantry, required);
    expect(r.status).toBe(status);
    expect(r.using).toBe(using);
  });
});

describe('canonicalize: unknown strings are stable', () => {
  it.each(
    table([
      ['yuzu kosho', 'yuzu kosho'],
      ['Yuzu Kosho', 'yuzu kosho'],
      ['2 tbsp finely chopped yuzu kosho', 'yuzu kosho'],
      ['tomato soup', 'tomato soup'],
      ['canned yuzu', 'canned yuzu'],
    ]),
  )('%s -> %s', (raw, want) => {
    const out = canonicalize(raw);
    expect(out).toBe(want);
    expect(canonicalize(out)).toBe(out); // idempotent
    expect(resolve(raw).known).toBe(false);
    expect(resolve(raw).entry).toBeUndefined();
  });

  it('handles empty and junk input without throwing', () => {
    expect(canonicalize('')).toBe('');
    expect(canonicalize('   ')).toBe('');
    expect(canonicalize('2 cups')).toBe('cup');
    expect(canonicalize('!!!')).toBe('');
  });
});

describe('resolve', () => {
  it('returns the entry for known strings', () => {
    const r = resolve('2 large Eggs');
    expect(r.known).toBe(true);
    expect(r.canonical).toBe('egg');
    expect(r.entry?.name).toBe('Eggs');
    expect(r.entry?.category).toBe('Dairy & Eggs');
  });

  it('every vocabulary canonical and synonym resolves back to its own entry', () => {
    for (const e of getVocabulary()) {
      for (const s of [e.canonical, e.name, ...e.synonyms]) {
        expect(resolve(s).canonical, `"${s}" should resolve to ${e.canonical}`).toBe(e.canonical);
      }
    }
  });
});

describe('suggest', () => {
  it.each(
    table([
      ['tomatoe', 'tomato'],
      ['brocoli', 'broccoli'],
      ['scal', 'green onion'],
      ['tomato', 'tomato'],
      ['tomatoes', 'tomato'],
      ['chick', 'chicken'],
      ['chicken b', 'chicken breast'],
      ['cilant', 'cilantro'],
      ['garlc', 'garlic'],
      ['avacado', 'avocado'],
      ['parmesan', 'parmesan'],
      ['aubergine', 'eggplant'],
    ]),
  )('"%s" -> top suggestion %s', (q, want) => {
    expect(suggest(q)[0]?.canonical).toBe(want);
  });

  it('ranks prefix before substring before fuzzy', () => {
    const out = suggest('onion').map((e) => e.canonical);
    expect(out[0]).toBe('onion');
    expect(out).toContain('green onion');
    expect(out).toContain('red onion');
  });

  it('respects limit and empty queries', () => {
    expect(suggest('c', 3).length).toBeLessThanOrEqual(3);
    expect(suggest('').length).toBe(0);
    expect(suggest('   ').length).toBe(0);
    expect(suggest('zzzzzzzz')).toEqual([]);
  });

  it('never returns duplicates', () => {
    const out = suggest('oil', 20).map((e) => e.canonical);
    expect(new Set(out).size).toBe(out.length);
  });
});

describe('satisfies', () => {
  it('equal is have', () => {
    expect(satisfies(['egg'], 'egg')).toEqual({ status: 'have', using: 'egg' });
  });

  it('pantry child satisfies recipe parent', () => {
    expect(satisfies(['chicken thigh'], 'chicken')).toEqual({ status: 'have', using: 'chicken thigh' });
  });

  it('pantry parent satisfies recipe child', () => {
    expect(satisfies(['chicken'], 'chicken breast')).toEqual({ status: 'have', using: 'chicken' });
  });

  it('sibling is a swap', () => {
    expect(satisfies(['chicken thigh'], 'chicken breast')).toEqual({ status: 'swap', using: 'chicken thigh' });
    expect(satisfies(['cheddar'], 'parmesan')).toEqual({ status: 'swap', using: 'cheddar' });
    expect(satisfies(['basmati rice'], 'jasmine rice')).toEqual({ status: 'swap', using: 'basmati rice' });
  });

  it('unrelated is missing', () => {
    expect(satisfies(['beef'], 'chicken breast')).toEqual({ status: 'missing' });
    expect(satisfies([], 'chicken breast')).toEqual({ status: 'missing' });
    expect(satisfies(['milk'], 'yuzu kosho')).toEqual({ status: 'missing' });
  });

  it('staples need no pantry entry', () => {
    expect(satisfies([], 'olive oil')).toEqual({ status: 'staple' });
    expect(satisfies([], 'cooking oil')).toEqual({ status: 'staple' });
    expect(satisfies([], 'sunflower oil')).toEqual({ status: 'staple' });
    expect(satisfies([], 'salt')).toEqual({ status: 'staple' });
    expect(satisfies([], 'black pepper')).toEqual({ status: 'staple' });
    expect(satisfies([], 'water')).toEqual({ status: 'staple' });
  });

  it('owning a staple is still reported as have; a sibling oil does not downgrade a staple', () => {
    expect(satisfies(['olive oil'], 'olive oil')).toEqual({ status: 'have', using: 'olive oil' });
    expect(satisfies(['sunflower oil'], 'olive oil')).toEqual({ status: 'staple' });
    expect(satisfies(['sesame oil'], 'olive oil')).toEqual({ status: 'staple' });
  });

  it('non-staples that look staple-ish are not staples', () => {
    expect(satisfies([], 'butter').status).toBe('missing');
    expect(satisfies([], 'sugar').status).toBe('missing');
    expect(satisfies([], 'flour').status).toBe('missing');
  });

  it('does not treat unrelated families as swaps (plant milk is not milk)', () => {
    expect(satisfies(['almond milk'], 'milk').status).toBe('missing');
    expect(satisfies(['coconut milk'], 'milk').status).toBe('missing');
  });

  it('accepts any iterable and returns the first match', () => {
    expect(satisfies(new Set(['rice', 'cheese']), 'basmati rice')).toEqual({ status: 'have', using: 'rice' });
    expect(satisfies(new Set(['cheddar', 'feta']), 'parmesan').using).toBe('cheddar');
  });

  it('have beats swap when both exist', () => {
    expect(satisfies(['chicken thigh', 'chicken'], 'chicken breast')).toEqual({ status: 'have', using: 'chicken' });
  });

  it('unknown required is only satisfied by the identical string', () => {
    expect(satisfies(['yuzu kosho'], 'yuzu kosho')).toEqual({ status: 'have', using: 'yuzu kosho' });
  });
});

describe('vocabulary integrity', () => {
  const vocab = getVocabulary();
  const byCanon = new Map(vocab.map((e) => [e.canonical, e]));

  it('has a sensible size', () => {
    expect(vocab.length).toBeGreaterThanOrEqual(250);
    expect(vocab.length).toBeLessThanOrEqual(520);
  });

  it('canonicals are unique, lowercase, and have Title Case names', () => {
    expect(byCanon.size).toBe(vocab.length);
    for (const e of vocab) {
      expect(e.canonical).toBe(e.canonical.toLowerCase());
      expect(e.canonical).toBe(e.canonical.trim());
      expect(e.name[0]).toBe(e.name[0].toUpperCase());
    }
  });

  it('categories are valid', () => {
    for (const e of vocab) expect(CATEGORIES).toContain(e.category);
  });

  it('every parent exists as an entry, and hierarchy is one level', () => {
    for (const e of vocab) {
      if (!e.parent) continue;
      const p = byCanon.get(e.parent);
      expect(p, `parent "${e.parent}" of "${e.canonical}"`).toBeDefined();
      expect(p?.parent, `"${e.parent}" must not itself have a parent`).toBeUndefined();
    }
  });

  it('no synonym or canonical maps to two entries', () => {
    expect(indexCollisions()).toEqual([]);
  });

  it('staples are exactly water, salt, black pepper, cooking oil and its children', () => {
    const staples = vocab.filter((e) => e.staple).map((e) => e.canonical);
    const expected = vocab
      .filter((e) => ['water', 'salt', 'black pepper', 'cooking oil'].includes(e.canonical) || e.parent === 'cooking oil')
      .map((e) => e.canonical);
    expect(new Set(staples)).toEqual(new Set(expected));
    expect(staples).toEqual(expect.arrayContaining(['water', 'salt', 'black pepper', 'cooking oil', 'olive oil']));
  });

  it('common set is about 80-100 and groups by category', () => {
    const common = vocab.filter((e) => e.common);
    expect(common.length).toBeGreaterThanOrEqual(80);
    expect(common.length).toBeLessThanOrEqual(100);
    expect(common.some((e) => e.staple)).toBe(false);
    const grouped = getCommon();
    expect(grouped.reduce((n, g) => n + g.entries.length, 0)).toBe(common.length);
    for (const g of grouped) {
      expect(CATEGORIES).toContain(g.category);
      expect(g.entries.every((e) => e.category === g.category && e.common)).toBe(true);
    }
  });

  it('plant milks and tamari are not placed under dairy milk / soy sauce', () => {
    expect(byCanon.get('almond milk')?.parent).toBeUndefined();
    expect(byCanon.get('coconut milk')?.parent).toBeUndefined();
  });

  it('covers every ingredient used by the existing seed recipes', () => {
    const seed = [
      'All-Purpose Flour', 'Apples', 'Baking Powder', 'Bananas', 'Bell Peppers', 'Black Beans', 'Black Pepper',
      'Bread', 'Broccoli', 'Butter', 'Canned Tomatoes', 'Carrots', 'Cheese', 'Chicken Breast', 'Chicken Broth',
      'Coconut Milk', 'Cumin', 'Eggs', 'Garlic', 'Garlic Powder', 'Greek Yogurt', 'Ground Beef', 'Lemons', 'Milk',
      'Mushrooms', 'Olive Oil', 'Onion', 'Paprika', 'Pasta', 'Potatoes', 'Quinoa', 'Rice', 'Salmon Fillet', 'Salt',
      'Soy Sauce', 'Spinach', 'Sugar', 'Tofu', 'Tomatoes', 'Oranges',
    ];
    for (const s of seed) expect(resolve(s).known, s).toBe(true);
  });

  it('covers frequent TheMealDB ingredient names', () => {
    const mealdb = [
      'Chicken Breast', 'Olive Oil', 'Onion', 'Garlic', 'Plain Flour', 'Caster Sugar', 'Double Cream', 'Soy Sauce',
      'Coriander', 'Chopped Tomatoes', 'Chicken Stock', 'Free-range Eggs', 'Spring Onions', 'Self-raising Flour',
      'Unsalted Butter', 'Red Chilli', 'Ginger', 'Cumin', 'Garam Masala', 'Coconut Milk', 'Lime', 'Thyme',
      'Bay Leaf', 'Parsley', 'Basil', 'Tomato Puree', 'Sea Salt', 'Vegetable Oil', 'Lemon Juice', 'Honey',
      'Minced Beef', 'Cheddar Cheese', 'Parmesan', 'Mozzarella', 'Worcestershire Sauce', 'Dijon Mustard',
      'Baking Powder', 'Icing Sugar', 'Brown Sugar', 'Cinnamon', 'Paprika', 'Turmeric', 'Cayenne Pepper',
      'Red Wine Vinegar', 'White Wine Vinegar', 'Balsamic Vinegar', 'Fish Sauce', 'Sesame Oil', 'Pasta',
      'Spaghetti', 'Basmati Rice', 'Egg Yolks', 'Milk', 'Butter', 'Salt', 'Pepper', 'Water',
    ];
    expect(mealdb.filter((s) => !resolve(s).known)).toEqual([]);
  });
});
