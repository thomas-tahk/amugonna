import { describe, expect, it } from 'vitest';
import { resolve } from './index.js';

/** Realistic phone-typed pantry text (issue #20): every row must resolve to a known vocabulary item. */
const KNOWN: [string, string][] = [
  ['2 eggs', 'egg'],
  ['half an onion', 'onion'],
  ['some garlic', 'garlic'],
  ['leftover rice', 'rice'],
  ['some leftover rice', 'rice'],
  ['chicken thighs', 'chicken thigh'],
  ['spinach', 'spinach'],
  ['parmesan', 'parmesan'],
  ['milk', 'milk'],
  ['butter', 'butter'],
  ['frozen peas', 'pea'],
  ['soy sauce', 'soy sauce'],
  ['bag of spinach', 'spinach'],
  ['tin of tomatoes', 'tomato'],
  ['can of chickpeas', 'chickpea'],
  ['jar of pesto', 'pesto'],
  ['block of cheddar', 'cheddar'],
  ['bunch of coriander', 'cilantro'],
  ['head of broccoli', 'broccoli'],
  ['a couple of potatoes', 'potato'],
  ['lots of rice', 'rice'],
  ['bit of ginger', 'ginger'],
  ['small piece of ginger', 'ginger'],
  ['old carrots', 'carrot'],
  ['ripe bananas', 'banana'],
  ['overripe bananas', 'banana'],
  ['baby spinach', 'spinach'],
  ['cherry tomatoes', 'cherry tomato'],
  ['free range eggs', 'egg'],
  ['organic milk', 'milk'],
  ['semi-skimmed milk', 'milk'],
  ['skimmed milk', 'milk'],
  ['whole milk', 'milk'],
  ['2% milk', 'milk'],
  ['greek yoghurt', 'greek yogurt'],
  ['natural yogurt', 'yogurt'],
  ['salted butter', 'butter'],
  ['unsalted butter', 'butter'],
  ['sourdough', 'sourdough'],
  ['wholemeal bread', 'whole wheat bread'],
  ['brown rice', 'brown rice'],
  ['basmati', 'basmati rice'],
  ['fresh basil', 'basil'],
  // the #20 repro phrases
  ['stale bread', 'bread'],
  ['day-old bread', 'bread'],
  ['low sodium soy sauce', 'soy sauce'],
  ['low-sodium soy sauce', 'soy sauce'],
  ['reduced sodium soy sauce', 'soy sauce'],
  ['light soy sauce', 'soy sauce'],
  ['a bit of cream', 'cream'],
  ['a little milk', 'milk'],
  ['half a bag of rice', 'rice'],
  ['a few carrots', 'carrot'],
  ['an old lemon', 'lemon'],
  ['reduced-fat milk', 'milk'],
  ['homemade bread', 'bread'],
  ['homemade stock', 'stock'],
];

describe('pantry phrases resolve to the vocabulary', () => {
  it.each(KNOWN)('%s -> %s', (raw, want) => {
    const r = resolve(raw);
    expect(r.canonical).toBe(want);
    expect(r.known).toBe(true);
  });
});

describe('pantry phrases: different items stay different', () => {
  it.each([
    ['dark chocolate', 'dark chocolate'],
    ['sour cream', 'sour cream'],
    ['bread crumbs', 'breadcrumb'],
    ['leftover chicken', 'cooked chicken'],
    ['cooked chicken', 'cooked chicken'],
    ['cooked rice', 'rice'],
    ['a little gem', 'lettuce'],
  ])('%s -> %s', (raw, want) => {
    const r = resolve(raw);
    expect(r.canonical).toBe(want);
    expect(r.known).toBe(true);
  });

  it('descriptors are not stripped from unknown items', () => {
    expect(resolve('leftover yuzu')).toMatchObject({ canonical: 'leftover yuzu', known: false });
  });
});
