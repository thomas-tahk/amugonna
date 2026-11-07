import { it, expect } from 'vitest';
import { ingredientMeasure } from './measure.js';

it.each([
  ['½ cup rice', '½ cup'], ['¾ cup rice', '¾ cup'], ['1½ cups rice', '1½ cups'],
  ['1 1/2 cups rice', '1 1/2 cups'], ['1/4 tsp salt', '1/4 tsp'], ['100g rice', '100g'],
  ['a pinch salt', 'a pinch'], ['an egg', 'an'], ['almond flakes', null], ['anchovy fillets', null],
])('preserves source amount in %s', (line, measure) => {
  expect(ingredientMeasure(line)).toBe(measure);
});
