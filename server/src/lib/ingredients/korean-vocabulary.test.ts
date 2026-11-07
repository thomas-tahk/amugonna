import { describe, expect, it } from 'vitest';
import { canonicalize, resolve } from './index.js';

describe('Korean ingredient vocabulary', () => {
  it.each([
    ['gochugaru', 'gochugaru'],
    ['Korean red pepper flakes', 'gochugaru'],
    ['Korean soybean paste', 'doenjang'],
    ['kimchee', 'kimchi'],
    ['Korean radish', 'Korean radish'],
    ['mu', 'Korean radish'],
    ['kkaennip', 'perilla leaf'],
    ['Korean rice cake', 'tteok'],
    ['tteokbokki rice cake', 'tteok'],
    ['Korean sweet potato glass noodles', 'dangmyeon'],
    ['japchae noodles', 'dangmyeon'],
    ['Korean roasted seaweed', 'gim'],
    ['dashima', 'dashima'],
    ['ssamjang', 'ssamjang'],
    ['aekjeot', 'Korean fish sauce'],
    ['maesil cheong', 'maesil syrup'],
    ['deulgireum', 'perilla oil'],
    ['jocheong', 'rice syrup'],
    ['myeolchi', 'dried anchovy'],
    ['eomuk', 'Korean fish cake'],
  ])('recognizes %s as %s', (raw, expected) => {
    expect(resolve(raw)).toMatchObject({ canonical: expected.toLowerCase(), known: true });
  });

  it('keeps Korean ingredients distinct from broad or neighboring names', () => {
    expect(canonicalize('chili flakes')).not.toBe('gochugaru');
    expect(canonicalize('miso paste')).not.toBe('doenjang');
    expect(canonicalize('rice cake')).not.toBe('tteok');
  });
});
