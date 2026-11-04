import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
// vitest runs with cwd = client/
const tokensCss = readFileSync('src/styles/tokens.css', 'utf8');

function parseTokens(css: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const m of css.matchAll(/--([\w-]+)\s*:\s*(#[0-9a-fA-F]{6})\s*;/g)) {
    out[m[1]] = m[2].toLowerCase();
  }
  return out;
}

function channel(c: number): number {
  const s = c / 255;
  return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
}

function luminance(hex: string): number {
  const n = parseInt(hex.slice(1), 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

function ratio(a: string, b: string): number {
  const la = luminance(a);
  const lb = luminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

const tokens = parseTokens(tokensCss);

// [text token, background token]
const TEXT_PAIRS: Array<[string, string]> = [
  ['color-ink', 'color-bg'],
  ['color-ink', 'color-surface'],
  ['color-ink-muted', 'color-bg'],
  ['color-ink-muted', 'color-surface'],
  ['color-on-primary', 'color-primary'],
  ['color-on-primary', 'color-primary-hover'],
  ['color-primary-text', 'color-bg'],
  ['color-primary-text', 'color-surface'],
  ['color-primary-text', 'color-missing-bg'],
  ['color-on-have', 'color-have'],
  ['color-missing', 'color-missing-bg'],
  ['color-on-swap', 'color-swap'],
  ['color-on-staple', 'color-staple'],
  ['color-error', 'color-error-bg'],
  ['color-success', 'color-success-bg'],
  ['color-on-header', 'color-header-bg'],
  ['color-bg', 'color-ink'], // pressed chip / hovered secondary button
  ['color-swap', 'color-header-bg'], // brand icon on header
];

// UI borders / icons need 3:1
const UI_PAIRS: Array<[string, string]> = [
  ['color-border', 'color-bg'],
  ['color-border', 'color-surface'],
  ['color-focus', 'color-bg'],
  ['color-focus', 'color-surface'],
  ['color-missing', 'color-bg'],
];

describe('design token contrast (WCAG)', () => {
  it('parses the tokens', () => {
    expect(tokens['color-ink']).toBe('#1a1210');
  });

  it('computes known reference ratios', () => {
    expect(ratio('#000000', '#ffffff')).toBeCloseTo(21, 5);
    expect(ratio('#777777', '#ffffff')).toBeCloseTo(4.48, 1);
  });

  it.each(TEXT_PAIRS)('%s on %s is at least 4.5:1', (fg, bg) => {
    expect(tokens[fg], fg).toBeDefined();
    expect(tokens[bg], bg).toBeDefined();
    expect(ratio(tokens[fg], tokens[bg])).toBeGreaterThanOrEqual(4.5);
  });

  it.each(UI_PAIRS)('%s on %s is at least 3:1', (fg, bg) => {
    expect(tokens[fg], fg).toBeDefined();
    expect(tokens[bg], bg).toBeDefined();
    expect(ratio(tokens[fg], tokens[bg])).toBeGreaterThanOrEqual(3);
  });
});
