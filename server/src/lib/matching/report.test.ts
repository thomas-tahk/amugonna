import { describe, expect, it } from 'vitest';
import { formatReport, pct, summarisePantry, table } from './report.js';
import type { RecipeMatch } from './match.js';

const m = (title: string, missing: string[] = []): RecipeMatch => ({
  id: 1,
  title,
  imageUrl: null,
  category: null,
  area: null,
  totalTime: null,
  ingredientCount: 3,
  usedCount: 3 - missing.length,
  missing: missing.map((n) => ({ name: n, canonical: n })),
  swaps: [],
});

describe('report helpers', () => {
  it('table escapes pipes and pct handles zero', () => {
    expect(table(['a'], [['x|y']])).toBe('| a |\n| --- |\n| x\\|y |');
    expect(pct(1, 3)).toBe(33.3);
    expect(pct(0, 0)).toBe(0);
  });

  it('summarisePantry counts all and truncates top lists', () => {
    const r = summarisePantry('P', 2, { cookNow: [m('a'), m('b')], oneAway: [m('c', ['salt'])], twoAway: [] }, 1);
    expect([r.cookNow, r.oneAway, r.twoAway]).toEqual([2, 1, 0]);
    expect(r.topCookNow).toHaveLength(1);
    expect(r.topOneAway[0]).toEqual({ title: 'c', missing: ['salt'] });
  });

  it('formatReport renders the sections', () => {
    const text = formatReport({
      generatedAt: 'now',
      totalRecipes: 1,
      bySource: [{ source: 'x', count: 1 }],
      vocabulary: { total: 4, inVocabulary: 3, rate: 75 },
      topNonVocabulary: [{ name: 'foo', count: 2 }],
      pantries: [summarisePantry('P', 2, { cookNow: [], oneAway: [m('c', ['salt'])], twoAway: [] })],
    });
    expect(text).toContain('75%');
    expect(text).toContain('| c | salt |');
    expect(text).toContain('_none_');
  });
});
