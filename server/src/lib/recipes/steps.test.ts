import { describe, it, expect } from 'vitest';
import { splitSteps } from './steps.js';

describe('splitSteps', () => {
  it('splits CRLF lines and drops blank lines', () => {
    expect(splitSteps('Boil the pasta.\r\n\r\nDrain it.\r\n  \r\nServe hot.')).toEqual([
      'Boil the pasta.',
      'Drain it.',
      'Serve hot.',
    ]);
  });

  it('drops "STEP n" headers (own line, any case, with punctuation)', () => {
    const text = 'STEP 1\r\nChop the onion.\r\nSTEP 2\r\nFry it gently.\r\nstep 3:\r\nServe.';
    expect(splitSteps(text)).toEqual(['Chop the onion.', 'Fry it gently.', 'Serve.']);
  });

  it('strips an inline "Step 1:" prefix', () => {
    expect(splitSteps('Step 1: Chop the onion.\nStep 2 - Fry it.')).toEqual(['Chop the onion.', 'Fry it.']);
  });

  it('strips numbering prefixes but keeps quantities', () => {
    expect(splitSteps('1. Mix the flour.\n2) Add 2 eggs.\n3 - Whisk well.')).toEqual([
      'Mix the flour.',
      'Add 2 eggs.',
      'Whisk well.',
    ]);
    expect(splitSteps('2 eggs are needed for this one')).toEqual(['2 eggs are needed for this one']);
  });

  it('drops lines that are only a number', () => {
    expect(splitSteps('1\r\nMix.\r\n2.\r\nBake.')).toEqual(['Mix.', 'Bake.']);
  });

  it('splits one long paragraph into sentences without breaking decimals', () => {
    const text =
      'Heat the oil in a pan. Add 1.5 cups of rice and stir for a minute. Pour in the water and bring to the boil. Cover and cook for 15 minutes.';
    expect(splitSteps(text)).toEqual([
      'Heat the oil in a pan.',
      'Add 1.5 cups of rice and stir for a minute.',
      'Pour in the water and bring to the boil.',
      'Cover and cook for 15 minutes.',
    ]);
  });

  it('merges very short sentence fragments into the previous step', () => {
    expect(
      splitSteps('Fry the onions until golden brown and soft. Season. Serve with rice and a wedge of lime.')
    ).toEqual(['Fry the onions until golden brown and soft. Season.', 'Serve with rice and a wedge of lime.']);
  });

  it('does not sentence-split text that is already several lines', () => {
    expect(splitSteps('Mix. Stir.\nBake it.')).toEqual(['Mix. Stir.', 'Bake it.']);
  });

  it('is idempotent on its own output joined with newlines', () => {
    const once = splitSteps('STEP 1\r\nChop.\r\n\r\n2. Fry the onions. Then add garlic.');
    expect(splitSteps(once.join('\n'))).toEqual(once);
  });

  it('handles empty / whitespace / nullish input', () => {
    expect(splitSteps('')).toEqual([]);
    expect(splitSteps('  \r\n \r\n')).toEqual([]);
    expect(splitSteps(null as unknown as string)).toEqual([]);
  });

  it('strips punctuation-free numbering only when lines form a 1,2,3 sequence', () => {
    expect(splitSteps('1 Preheat the oven to 200C.\n2 Mix the flour and eggs.\n3 Bake for 20 minutes.')).toEqual([
      'Preheat the oven to 200C.',
      'Mix the flour and eggs.',
      'Bake for 20 minutes.',
    ]);
    // not a sequence -> untouched
    expect(splitSteps('2 Eggs are beaten in a bowl.\n3 Cups of flour go in next.')).toEqual([
      '2 Eggs are beaten in a bowl.',
      '3 Cups of flour go in next.',
    ]);
    expect(splitSteps('1 Large pan is needed.\nAdd the oil.')).toEqual(['1 Large pan is needed.', 'Add the oil.']);
  });

  it('drops all-caps step headers like "STEP 1 - MAKE THE SAUCE" but keeps real steps', () => {
    const text = 'STEP 1 - MAKE THE SAUCE\r\nChop the onion.\r\nSTEP 2: BAKE\r\nBake for 20 minutes.\r\nStep 3: Serve it up.';
    expect(splitSteps(text)).toEqual(['Chop the onion.', 'Bake for 20 minutes.', 'Serve it up.']);
  });

  it('does not split a paragraph on common abbreviations', () => {
    const text =
      'Add 2 tbsp. Of oil to the pan and heat for approx. Five minutes. Stir in the spice, i.e. The curry powder, and cook for 3 min. Then add the stock. Simmer gently until thick.';
    expect(splitSteps(text)).toEqual([
      'Add 2 tbsp. Of oil to the pan and heat for approx. Five minutes.',
      'Stir in the spice, i.e. The curry powder, and cook for 3 min. Then add the stock.',
      'Simmer gently until thick.',
    ]);
  });
});
