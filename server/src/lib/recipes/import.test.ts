import { describe, it, expect, vi } from 'vitest';
import { fetchMealDbLetter, fetchAllMeals, importMeals, summarise } from './import.js';

const json = (body: unknown, status = 200) =>
  Promise.resolve(new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } }));

const meal = (id: string) => ({ idMeal: id, strMeal: `Meal ${id}` });

describe('fetchMealDbLetter (mocked fetch)', () => {
  it('requests search.php?f=<letter> and returns meals', async () => {
    const f = vi.fn(() => json({ meals: [meal('1'), meal('2')] }));
    const meals = await fetchMealDbLetter('a', { fetchImpl: f as any, retryDelayMs: 0 });
    expect(meals).toHaveLength(2);
    expect(f.mock.calls[0][0]).toBe('https://www.themealdb.com/api/json/v1/1/search.php?f=a');
  });

  it('treats {"meals": null} (no recipe for that letter) as empty', async () => {
    const f = vi.fn(() => json({ meals: null }));
    expect(await fetchMealDbLetter('x', { fetchImpl: f as any, retryDelayMs: 0 })).toEqual([]);
  });

  it('retries failures up to 3 attempts, then succeeds', async () => {
    const f = vi
      .fn()
      .mockImplementationOnce(() => json({}, 500))
      .mockImplementationOnce(() => Promise.reject(new Error('socket hang up')))
      .mockImplementationOnce(() => json({ meals: [meal('9')] }));
    const meals = await fetchMealDbLetter('b', { fetchImpl: f as any, retryDelayMs: 0 });
    expect(meals).toHaveLength(1);
    expect(f).toHaveBeenCalledTimes(3);
  });

  it('throws after 3 failed attempts', async () => {
    const f = vi.fn(() => json({}, 503));
    await expect(fetchMealDbLetter('c', { fetchImpl: f as any, retryDelayMs: 0 })).rejects.toThrow(/503/);
    expect(f).toHaveBeenCalledTimes(3);
  });

  it('times out a hung request', async () => {
    const f = vi.fn(
      (_url: string, init?: RequestInit) =>
        new Promise<Response>((_res, rej) => init?.signal?.addEventListener('abort', () => rej(new Error('aborted'))))
    );
    await expect(
      fetchMealDbLetter('d', { fetchImpl: f as any, retryDelayMs: 0, timeoutMs: 20, attempts: 2 })
    ).rejects.toThrow();
    expect(f).toHaveBeenCalledTimes(2);
  });
});

describe('fetchAllMeals (mocked fetch)', () => {
  it('walks a..z, de-duplicates by idMeal', async () => {
    const seen: string[] = [];
    const f = vi.fn((url: string) => {
      const letter = new URL(url).searchParams.get('f')!;
      seen.push(letter);
      if (letter === 'a') return json({ meals: [meal('1'), meal('2')] });
      if (letter === 'b') return json({ meals: [meal('1'), meal('3')] });
      return json({ meals: null });
    });
    const meals = await fetchAllMeals({ fetchImpl: f as any, retryDelayMs: 0, delayMs: 0 });
    expect(seen.join('')).toBe('abcdefghijklmnopqrstuvwxyz');
    expect(meals.map((m) => m.idMeal)).toEqual(['1', '2', '3']);
  });
});

describe('importMeals / summarise', () => {
  it('maps meals, upserts them and aggregates counts and unmatched names', async () => {
    const upsert = vi
      .fn()
      .mockResolvedValueOnce({ created: true, ingredientsCreated: 1, unmatched: [{ name: 'Yuzu', canonical: 'yuzu' }] })
      .mockResolvedValueOnce({
        created: false,
        ingredientsCreated: 1,
        unmatched: [
          { name: 'yuzu', canonical: 'yuzu' },
          { name: 'Dulse', canonical: 'dulse' },
        ],
      });
    const res = await importMeals({} as any, [meal('1'), meal('2')] as any, 7, {}, upsert as any);
    expect(upsert).toHaveBeenCalledTimes(2);
    expect(upsert.mock.calls[0][2]).toBe(7);
    expect(res).toMatchObject({ fetched: 2, created: 1, updated: 1, ingredientsCreated: 2 });
    expect(res.unmatched.get('yuzu')).toBe(2);
    expect(summarise(res)).toMatch(/fetched 2.*created 1.*updated 1.*ingredients created 2/s);
    expect(summarise(res)).toContain('yuzu');
  });
});
