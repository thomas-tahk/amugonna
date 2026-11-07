import { describe, it, expect } from 'vitest';
import { assessIngredients, allowedPantry } from './exclusions.js';

const milk = { avoidedAllergens: ['milk'], excludedIngredients: [] };
const assess = (names: string[], preferences = milk) => assessIngredients(names, preferences);

describe('ingredient exclusions', () => {
  it.each(['milk', 'lactose-free milk', 'whey protein', 'casein', 'ghee', 'parmesan', 'goat cheese', 'buttermilk'])('blocks dairy derivative %s', name => {
    expect(assess([name]).blocked).toEqual([name]);
  });
  it.each(['coconut milk', 'almond milk', 'oat milk', 'cream of tartar', 'butter bean', 'butternut squash', 'peanut butter'])('does not confuse %s with dairy', name => {
    expect(assess([name]).blocked).toEqual([]);
  });
  it.each([
    ['egg', 'mayonnaise'], ['fish', 'fish sauce'], ['shellfish', 'shrimp'],
    ['peanut', 'peanut oil'], ['tree-nut', 'almond milk'], ['wheat', 'soy sauce'],
    ['soy', 'tofu'], ['sesame', 'tahini'],
  ])('blocks %s derivatives', (allergen, name) => {
    expect(assess([name], { avoidedAllergens: [allergen], excludedIngredients: [] }).blocked).toEqual([name]);
  });
  it('supports custom aliases and parent ingredients without substring collisions', () => {
    const preferences = { avoidedAllergens: [], excludedIngredients: ['mushrooms', 'onion'] };
    expect(assess(['cremini mushrooms', 'red onion', 'garlic'], preferences).blocked).toEqual(['cremini mushrooms', 'red onion']);
    expect(assess(['eggplant'], { avoidedAllergens: ['egg'], excludedIngredients: [] }).blocked).toEqual([]);
  });
  it('flags unknown ingredients when exclusions are active', () => {
    expect(assess(['mystery sauce']).uncertain).toEqual(['mystery sauce']);
    expect(assess(['mystery sauce'], { avoidedAllergens: [], excludedIngredients: [] }).uncertain).toEqual([]);
  });
  it('clears uncertainty only for reviewed ingredients and retains explicit blocks', () => {
    const reviewed = { avoidedAllergens: ['milk'], excludedIngredients: [], reviewedIngredients: ['kimchi', 'mystery sauce', 'milk', 'whey'] };
    expect(assess(['kimchi', 'mystery sauce', 'milk', 'whey'], reviewed)).toEqual({
      blocked: ['milk', 'whey'], uncertain: [],
    });
  });
  it('clears uncertainty for a canonical alias the user reviewed', () => {
    expect(assess(['kimchee'], { avoidedAllergens: ['milk'], excludedIngredients: [], reviewedIngredients: ['kimchi'] }).uncertain).toEqual([]);
  });
  it.each(['stock with cheddar', 'stock with parmesan'])('blocks dairy in %s even when stock was reviewed', name => {
    expect(assess([name], { ...milk, reviewedIngredients: ['stock'] }).blocked).toEqual([name]);
  });
  it('blocks explicit custom exclusions inside a reviewed ingredient label', () => {
    expect(assess(['stock with onion'], { avoidedAllergens: [], excludedIngredients: ['onion'], reviewedIngredients: ['stock'] }).blocked)
      .toEqual(['stock with onion']);
  });
  it('blocks shrimp added to reviewed kimchi for shellfish avoidance', () => {
    expect(assess(['kimchi with shrimp'], { avoidedAllergens: ['shellfish'], excludedIngredients: [], reviewedIngredients: ['kimchi'] }).blocked)
      .toEqual(['kimchi with shrimp']);
  });
  it.each(['Korean fish cake', 'eomuk', 'odeng'])('blocks fish in reviewed Korean fish cake label %s', name => {
    expect(assess([name], { avoidedAllergens: ['fish'], excludedIngredients: [], reviewedIngredients: ['Korean fish cake'] }).blocked)
      .toEqual([name]);
  });
  it('keeps Korean fish cake uncertain for other active exclusions', () => {
    expect(assess(['eomuk'], { avoidedAllergens: ['wheat'], excludedIngredients: [] }).uncertain).toEqual(['eomuk']);
  });
  it.each(['doenjang', 'ssamjang', 'gochujang'])('blocks soy in reviewed %s', name => {
    expect(assess([name], { avoidedAllergens: ['soy'], excludedIngredients: [], reviewedIngredients: [name] }).blocked)
      .toEqual([name]);
  });
  it('blocks shrimp paste and saeujeot for shellfish avoidance', () => {
    const preferences = { avoidedAllergens: ['shellfish'], excludedIngredients: [], reviewedIngredients: ['saeujeot'] };
    expect(assess(['shrimp paste', 'saeujeot'], preferences).blocked).toEqual(['shrimp paste', 'saeujeot']);
  });
  it('requires label review for composite foods', () => {
    expect(assess(['margarine', 'bread']).uncertain).toEqual(['margarine', 'bread']);
  });
  it('removes forbidden pantry substitutes', () => {
    expect(allowedPantry(['parmesan', 'rice', 'mushroom'], milk)).toEqual(['rice', 'mushroom']);
  });
  it.each(['creme fraiche', 'dulce de leche'])('blocks known dairy %s', name => {
    expect(assess([name]).blocked).toEqual([name]);
  });
  it.each(['dark chocolate', 'red curry paste', 'lamb stock', 'shortcrust pastry', 'hummus', 'hoisin sauce', 'gochujang', 'kimchi', 'doenjang'])('holds composite %s for review', name => {
    expect(assess([name]).uncertain).toEqual([name]);
  });
  it.each(['rice flour', 'chickpea flour', 'corn tortilla', 'rice noodles', 'almond flour', 'almond meal'])('does not label %s as wheat', name => {
    expect(assess([name], { avoidedAllergens: ['wheat'], excludedIngredients: [] }).blocked).toEqual([]);
  });
  it('does not let normalization hide an explicit forbidden ingredient', () => {
    expect(assess(['tomato with milk']).blocked).toEqual(['tomato with milk']);
  });
  it.each(['coconut milk with cream', 'peanut butter with whey'])('checks additions to %s', name => {
    expect(assess([name]).blocked).toEqual([name]);
  });
  it.each(['rice flour with wheat flour', 'rice noodles with soy sauce'])('checks additions to %s for wheat', name => {
    expect(assess([name], { avoidedAllergens: ['wheat'], excludedIngredients: [] }).blocked).toEqual([name]);
  });
  it('recognizes a leading to-taste measure in source text', () => {
    expect(assess(['to taste Salt', 'to taste Black Pepper'])).toEqual({ blocked: [], uncertain: [] });
  });
});
