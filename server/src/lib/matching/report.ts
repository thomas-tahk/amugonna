/** Pure formatting for the match report (scripts/report-matches.ts). No DB. */
import type { RecipeMatch } from './match.js';

export interface PantryReport {
  name: string;
  size: number;
  cookNow: number;
  oneAway: number;
  twoAway: number;
  topCookNow: { title: string; missing: string[] }[];
  topOneAway: { title: string; missing: string[] }[];
}

export interface Report {
  generatedAt: string;
  totalRecipes: number;
  bySource: { source: string; count: number }[];
  vocabulary: { total: number; inVocabulary: number; rate: number };
  topNonVocabulary: { name: string; count: number }[];
  pantries: PantryReport[];
}

const esc = (s: string) => s.replace(/\|/g, '\\|').replace(/\r?\n/g, ' ');

export function table(headers: string[], rows: (string | number)[][]): string {
  const line = (cells: (string | number)[]) => `| ${cells.map((c) => esc(String(c))).join(' | ')} |`;
  return [line(headers), line(headers.map(() => '---')), ...rows.map(line)].join('\n');
}

export const pct = (n: number, d: number): number => (d === 0 ? 0 : Math.round((n / d) * 1000) / 10);

export function summarisePantry(
  name: string,
  size: number,
  r: { cookNow: RecipeMatch[]; oneAway: RecipeMatch[]; twoAway: RecipeMatch[] },
  top = 10
): PantryReport {
  const brief = (m: RecipeMatch) => ({ title: m.title, missing: m.missing.map((x) => x.name) });
  return {
    name,
    size,
    cookNow: r.cookNow.length,
    oneAway: r.oneAway.length,
    twoAway: r.twoAway.length,
    topCookNow: r.cookNow.slice(0, top).map(brief),
    topOneAway: r.oneAway.slice(0, top).map(brief),
  };
}

export function formatReport(rep: Report): string {
  const out: string[] = [];
  out.push('# Match report', '', `Generated ${rep.generatedAt}`, '');
  out.push(`## Recipes by source (${rep.totalRecipes} total)`, '');
  out.push(table(['externalSource', 'recipes'], rep.bySource.map((s) => [s.source, s.count])), '');
  const v = rep.vocabulary;
  out.push('## Vocabulary match rate', '');
  out.push(`${v.inVocabulary} of ${v.total} recipe ingredient lines link to a vocabulary ingredient (${v.rate}%).`, '');
  out.push('Top non-vocabulary ingredients:', '');
  out.push(table(['ingredient', 'lines'], rep.topNonVocabulary.map((n) => [n.name, n.count])), '');
  out.push('## Reference pantries', '');
  out.push(
    table(
      ['pantry', 'items', 'cook now', 'one away', 'two away'],
      rep.pantries.map((p) => [p.name, p.size, p.cookNow, p.oneAway, p.twoAway])
    ),
    ''
  );
  for (const p of rep.pantries) {
    out.push(`### ${p.name}`, '');
    out.push('Cook now (top 10):', '');
    out.push(p.topCookNow.length ? table(['recipe'], p.topCookNow.map((m) => [m.title])) : '_none_', '');
    out.push('One away (top 10):', '');
    out.push(
      p.topOneAway.length ? table(['recipe', 'missing'], p.topOneAway.map((m) => [m.title, m.missing.join(', ')])) : '_none_',
      ''
    );
  }
  return out.join('\n');
}
