import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import userEvent from '@testing-library/user-event';
import CookScreen from './CookScreen';
import type { CookRecipe, RecipeMatch, Suggestions } from '../../types/cook';

const match = (id: number, title: string, over: Partial<RecipeMatch> = {}): RecipeMatch => ({
  id,
  title,
  imageUrl: null,
  category: 'Chicken',
  area: 'Italian',
  totalTime: 30,
  ingredientCount: 5,
  usedCount: 5,
  missing: [],
  swaps: [],
  ...over,
});

const suggestions: Suggestions = {
  pantrySize: 6,
  totalRecipes: 50,
  cookNow: [match(1, 'Garlic Chicken'), match(2, 'Egg Fried Rice')],
  oneAway: [
    match(3, 'Lemon Chicken', { missing: [{ name: 'lemon', canonical: 'lemon' }] }),
    match(4, 'Cheesy Pasta', {
      missing: [{ name: 'basil', canonical: 'basil' }],
      swaps: [{ need: 'parmesan', using: 'cheddar' }],
    }),
  ],
  twoAway: [match(5, 'Beef Stew')],
};

const recipe: CookRecipe = {
  id: 3,
  title: 'Lemon Chicken',
  description: null,
  imageUrl: null,
  category: 'Chicken',
  area: 'Italian',
  servings: 4,
  prepTime: 10,
  cookTime: 20,
  steps: ['Season the chicken.', 'Sear until golden.', 'Squeeze lemon over.'],
  sourceName: 'TheMealDB',
  sourceUrl: 'https://example.com/lemon-chicken',
  attribution: 'Recipe from TheMealDB',
  license: null,
  isFavorite: false,
  isOwner: false,
  ingredients: [
    { name: 'chicken thighs', canonical: 'chicken', measure: '500g', optional: false, status: 'have' },
    { name: 'parmesan', canonical: 'parmesan', measure: '30g', optional: false, status: 'swap', using: 'cheddar' },
    { name: 'lemon', canonical: 'lemon', measure: '1', optional: false, status: 'missing' },
    { name: 'basil', canonical: 'basil', measure: null, optional: false, status: 'missing' },
    { name: 'salt', canonical: 'salt', measure: null, optional: false, status: 'staple' },
  ],
};

const ok = (data: unknown) => ({ ok: true, json: async () => ({ success: true, message: 'ok', data }) });

function mockFetch(data: Suggestions = suggestions, rec: typeof recipe = recipe) {
  const fn = vi.fn(async (url: string) => {
    if (String(url).endsWith('/recipes/suggestions')) return ok(data);
    if (String(url).endsWith('/recipes/3')) return ok({ recipe: rec });
    return { ok: false, json: async () => ({ success: false, message: 'nope' }) };
  });
  vi.stubGlobal('fetch', fn);
  return fn;
}

beforeEach(() => {
  window.history.replaceState(null, '', '#cook');
  localStorage.setItem('authToken', 'tok');
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('CookScreen results', () => {
  it('shows both sections with counts and the missing item and swap note', async () => {
    mockFetch();
    render(<CookScreen />);
    expect(await screen.findByRole('heading', { name: 'Cook now (2)' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: '1 ingredient away (2)' })).toBeInTheDocument();
    expect(screen.getByText('Need: lemon')).toBeInTheDocument();
    expect(screen.getAllByText('uses 5 of your items').length).toBeGreaterThan(0);
    expect(screen.getByText('using cheddar for parmesan')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /2 ingredients away \(1\)/ })).toHaveAttribute('aria-expanded', 'false');
  });

  it('sends the auth token', async () => {
    const fn = mockFetch();
    render(<CookScreen />);
    await screen.findByText('Cook now (2)');
    const init = (fn.mock.calls[0] as unknown as [string, RequestInit])[1];
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer tok');
  });

  it('empty pantry navigates to Kitchen', async () => {
    mockFetch({ pantrySize: 0, totalRecipes: 50, cookNow: [], oneAway: [], twoAway: [] });
    const onNavigate = vi.fn();
    render(<CookScreen onNavigate={onNavigate} />);
    await userEvent.click(await screen.findByRole('button', { name: 'Fill your kitchen' }));
    expect(onNavigate).toHaveBeenCalledWith('kitchen');
  });

  it('pantry with no cook-now matches shows a hint plus the near matches', async () => {
    mockFetch({ ...suggestions, cookNow: [] });
    render(<CookScreen />);
    expect(await screen.findByText('Nothing you can cook right now')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: '1 ingredient away (2)' })).toBeInTheDocument();
  });

  it('shows an error with retry', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValueOnce(new Error('offline')));
    render(<CookScreen />);
    expect(await screen.findByRole('alert')).toHaveTextContent("Can't reach Amugonna");
    const fn = mockFetch();
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(await screen.findByText('Cook now (2)')).toBeInTheDocument();
    expect(fn).toHaveBeenCalled();
  });
});

describe('Cook view', () => {
  const openLemon = async () => {
    render(<CookScreen />);
    await userEvent.click(await screen.findByRole('button', { name: /Lemon Chicken/ }));
    return screen.findByRole('heading', { level: 1, name: 'Lemon Chicken' });
  };

  it('fetches the recipe and shows ingredients with badges and numbered steps', async () => {
    const fn = mockFetch();
    await openLemon();
    expect(fn.mock.calls.some((c) => String(c[0]).endsWith('/recipes/3'))).toBe(true);
    const ings = screen.getAllByRole('listitem').filter((li) => li.classList.contains('cook-ing'));
    expect(ings).toHaveLength(5);
    const row = (name: string) => ings.find((li) => li.textContent?.includes(name))!;
    expect(within(row('chicken thighs')).getByText('✓ Have')).toBeInTheDocument();
    expect(within(row('parmesan')).getByText('using cheddar')).toBeInTheDocument();
    expect(within(row('lemon')).getByText('Missing')).toBeInTheDocument();
    expect(within(row('salt')).getByText('Assumed')).toBeInTheDocument();
    expect(document.querySelectorAll('ol.cook-steps > li')).toHaveLength(3);
    expect(screen.getAllByRole('button', { name: /chicken\.|golden\.|lemon over\./ })).toHaveLength(3);
    const link = screen.getByRole('link', { name: 'Recipe from TheMealDB' });
    expect(link).toHaveAttribute('href', 'https://example.com/lemon-chicken');
  });

  it('tapping a step marks it done', async () => {
    mockFetch();
    await openLemon();
    const step = screen.getByRole('button', { name: 'Season the chicken.' });
    await userEvent.click(step);
    expect(step).toHaveAttribute('aria-pressed', 'true');
    expect(step).toHaveClass('cook-step-done');
  });

  it('copies the missing items one per line and shows Copied', async () => {
    mockFetch();
    await openLemon();
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
    await userEvent.click(screen.getByRole('button', { name: 'Copy missing items' }));
    expect(writeText).toHaveBeenCalledWith('lemon\nbasil');
    expect(await screen.findByRole('button', { name: 'Copied ✓' })).toBeInTheDocument();
  });

  it('optional items that are not owned stay out of the Missing box and copy list', async () => {
    mockFetch(suggestions, {
      ...recipe,
      ingredients: [
        ...recipe.ingredients,
        { name: 'parsley', canonical: 'parsley', measure: null, optional: true, status: 'missing' as const },
      ],
    });
    await openLemon();
    expect(screen.getByText('Missing (2)')).toBeInTheDocument();
    const parsley = screen.getAllByRole('listitem').find((li) => li.textContent?.includes('parsley'))!;
    expect(parsley).toHaveTextContent('(optional)');
    expect(parsley.closest('.cook-missing')).toBeNull();
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
    await userEvent.click(screen.getByRole('button', { name: 'Copy missing items' }));
    expect(writeText).toHaveBeenCalledWith('lemon\nbasil');
  });

  it('Back returns to results', async () => {
    mockFetch();
    await openLemon();
    await userEvent.click(screen.getByRole('button', { name: /Back/ }));
    expect(await screen.findByRole('heading', { name: 'Cook now (2)' })).toBeInTheDocument();
  });

  it('phone back (popstate) returns to results', async () => {
    mockFetch();
    await openLemon();
    window.history.back();
    expect(await screen.findByRole('heading', { name: 'Cook now (2)' })).toBeInTheDocument();
  });

  it('requests a screen wake lock and releases it on close', async () => {
    mockFetch();
    const release = vi.fn().mockResolvedValue(undefined);
    const request = vi.fn().mockResolvedValue({ release });
    Object.defineProperty(navigator, 'wakeLock', { value: { request }, configurable: true });
    try {
      await openLemon();
      await waitFor(() => expect(request).toHaveBeenCalledWith('screen'));
      await userEvent.click(screen.getByRole('button', { name: /Back/ }));
      await waitFor(() => expect(release).toHaveBeenCalled());
    } finally {
      Reflect.deleteProperty(navigator, 'wakeLock');
    }
  });

  it('re-acquires the wake lock when the tab becomes visible again', async () => {
    mockFetch();
    const request = vi.fn().mockResolvedValue({ release: vi.fn().mockResolvedValue(undefined) });
    Object.defineProperty(navigator, 'wakeLock', { value: { request }, configurable: true });
    try {
      await openLemon();
      await waitFor(() => expect(request).toHaveBeenCalledTimes(1));
      document.dispatchEvent(new Event('visibilitychange'));
      await waitFor(() => expect(request).toHaveBeenCalledTimes(2));
    } finally {
      Reflect.deleteProperty(navigator, 'wakeLock');
    }
  });

  it('scrolls to top on open and restores scroll on back', async () => {
    mockFetch();
    const scrollTo = vi.fn();
    vi.stubGlobal('scrollTo', scrollTo);
    Object.defineProperty(window, 'scrollY', { value: 420, configurable: true });
    try {
      await openLemon();
      expect(scrollTo).toHaveBeenCalledWith(0, 0);
      await userEvent.click(screen.getByRole('button', { name: /Back/ }));
      await screen.findByRole('heading', { name: 'Cook now (2)' });
      expect(scrollTo).toHaveBeenLastCalledWith(0, 420);
    } finally {
      Reflect.deleteProperty(window, 'scrollY');
    }
  });

  it('keeps the open recipe across a tab remount without extra history entries', async () => {
    mockFetch();
    const first = render(<CookScreen />);
    await userEvent.click(await screen.findByRole('button', { name: /Lemon Chicken/ }));
    await screen.findByRole('heading', { level: 1, name: 'Lemon Chicken' });
    const push = vi.spyOn(window.history, 'pushState');
    first.unmount(); // switching to Kitchen
    render(<CookScreen />); // switching back
    expect(await screen.findByRole('heading', { level: 1, name: 'Lemon Chicken' })).toBeInTheDocument();
    expect(push).not.toHaveBeenCalled();
    // back to results, then open another: exactly one new entry
    await userEvent.click(screen.getByRole('button', { name: /Back/ }));
    await screen.findByRole('heading', { name: 'Cook now (2)' });
    await userEvent.click(screen.getByRole('button', { name: /Lemon Chicken/ }));
    await screen.findByRole('heading', { level: 1, name: 'Lemon Chicken' });
    expect(push).toHaveBeenCalledTimes(1);
  });

  it('uses empty alt text on images (title is the button label)', async () => {
    mockFetch({ ...suggestions, cookNow: [match(9, 'Pic', { imageUrl: 'http://x/y.png' })] });
    render(<CookScreen />);
    await screen.findByText('Cook now (1)');
    expect(document.querySelector('.cook-card img')).toHaveAttribute('alt', '');
    expect(screen.getByRole('button', { name: /Pic/ })).toBeInTheDocument();
  });

  it('works without wake lock support', async () => {
    mockFetch();
    await expect(openLemon()).resolves.toBeInTheDocument();
  });

  it('puts the recipe in the URL hash and focuses its title; Back restores the results heading focus', async () => {
    mockFetch();
    const title = await openLemon();
    expect(window.location.hash).toBe('#cook/recipe/3');
    await waitFor(() => expect(title).toHaveFocus());
    await userEvent.click(screen.getByRole('button', { name: /Back/ }));
    const heading = await screen.findByRole('heading', { name: 'Cook now (2)' });
    expect(window.location.hash).toBe('#cook');
    await waitFor(() => expect(heading).toHaveFocus());
  });

  it('opens the recipe straight from a #cook/recipe/<id> URL (reload) and Back still lands on results', async () => {
    mockFetch();
    window.history.replaceState(null, '', '#cook/recipe/3');
    render(<CookScreen />);
    expect(await screen.findByRole('heading', { level: 1, name: 'Lemon Chicken' })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /Back/ }));
    expect(await screen.findByRole('heading', { name: 'Cook now (2)' })).toBeInTheDocument();
    expect(window.location.hash).toBe('#cook');
  });

  it('shows a slim band, not a big block, when there is no image', async () => {
    mockFetch();
    await openLemon();
    const band = document.querySelector('.cook-view-media');
    expect(band?.tagName).toBe('DIV');
    expect(band).toHaveClass('cook-card-placeholder');
  });
});

describe('Cook view styles', () => {
  const css = readFileSync('src/components/cook/Cook.css', 'utf8');
  it('the empty-image band is slim and photos are capped on phones', () => {
    expect(css).toMatch(/\.cook-view-media\.cook-card-placeholder\s*\{[^}]*height:\s*64px/);
    expect(css).toMatch(/max-width:\s*599px\)\s*\{\s*\.cook-view-media\s*\{\s*max-height:\s*33vh/);
  });
  it('cards keep a visible focus ring that the .card shadow does not override', () => {
    const base = readFileSync('src/styles/base.css', 'utf8');
    expect(base.indexOf('.card:focus-visible')).toBeGreaterThan(base.indexOf('\n.card {'));
    expect(base).toMatch(/\.card:focus-visible\s*\{[^}]*var\(--focus-ring\)/);
  });
});
