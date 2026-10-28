import React, { useState } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import KitchenScreen from './KitchenScreen';
import CookScreen from '../cook/CookScreen';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

// Same shape as AppShell: one screen at a time, so Kitchen unmounts when Cook mounts.
const Harness: React.FC = () => {
  const [tab, setTab] = useState<'kitchen' | 'cook'>('kitchen');
  return (
    <>
      <button onClick={() => setTab('kitchen')}>Kitchen tab</button>
      <button onClick={() => setTab('cook')}>Cook tab</button>
      {tab === 'kitchen' ? (
        <KitchenScreen onNavigate={() => setTab('cook')} />
      ) : (
        <CookScreen onNavigate={() => setTab('kitchen')} />
      )}
    </>
  );
};

const ok = (data: unknown) => ({ ok: true, json: async () => ({ success: true, data }) });
const eggs = { id: 104, userId: 1, ingredientId: 4, addedAt: '', ingredient: { id: 4, name: 'Eggs', category: null } };
const recipe = {
  id: 7,
  title: 'Omelette',
  imageUrl: null,
  category: null,
  area: null,
  totalTime: 10,
  ingredientCount: 2,
  usedCount: 2,
  missing: [],
  swaps: [],
};

let calls: { url: string; init?: RequestInit }[];
let saved: boolean;
let releaseBulk: () => void;
const suggestionCalls = () => calls.filter((c) => c.url.includes('/recipes/suggestions'));

beforeEach(() => {
  calls = [];
  saved = false;
  localStorage.setItem('authToken', 'tok');
  window.history.replaceState(null, '');
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: string, init?: RequestInit) => {
      const url = String(input);
      calls.push({ url, init });
      if (url.includes('/ingredients/common')) {
        return ok({ groups: [{ category: 'Dairy & eggs', items: [{ id: 4, name: 'Eggs', canonical: 'egg' }] }], staples: [] });
      }
      if (url.includes('/ingredients/user/bulk')) {
        if (!init?.keepalive) await new Promise<void>((r) => (releaseBulk = r)); // deferred until the test releases it
        saved = true;
        return ok({ ingredients: [eggs], resolved: [] });
      }
      if (url.includes('/ingredients/user')) return ok({ ingredients: [] });
      if (url.includes('/recipes/suggestions')) {
        return ok({
          pantrySize: saved ? 1 : 0,
          totalRecipes: 10,
          cookNow: saved ? [recipe] : [],
          oneAway: [],
          twoAway: [],
        });
      }
      throw new Error(`unmocked ${url}`);
    }),
  );
});
afterEach(() => vi.unstubAllGlobals());

describe('pantry writes vs. Cook (#13)', () => {
  it('tick then immediately switch to Cook: suggestions are requested only after the bulk save resolves', async () => {
    const user = userEvent.setup({ delay: null });
    render(<Harness />);
    await user.click(await screen.findByRole('button', { name: 'Eggs' }));
    const before = suggestionCalls().length; // Kitchen's own cook-now count, from loading
    // Switch tabs inside the debounce window: Kitchen's unmount flush sends the save.
    await user.click(screen.getByRole('button', { name: 'Cook tab' }));
    await waitFor(() => expect(calls.some((c) => c.url.includes('/user/bulk'))).toBe(true));
    // Bulk is still unresolved: Cook shows its skeleton and has not asked for suggestions.
    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });
    expect(screen.getByRole('status')).toHaveTextContent('Loading recipes');
    expect(suggestionCalls()).toHaveLength(before);
    expect(screen.queryByText('Your kitchen is empty')).not.toBeInTheDocument();

    await act(async () => releaseBulk());
    expect(await screen.findByRole('heading', { name: 'Cook now (1)' })).toBeInTheDocument();
    expect(suggestionCalls()).toHaveLength(before + 1);
    expect(screen.queryByText('Your kitchen is empty')).not.toBeInTheDocument();
  });

  it('Cook re-fetches when the window regains focus while showing the empty state', async () => {
    render(<CookScreen />);
    expect(await screen.findByText('Your kitchen is empty')).toBeInTheDocument();
    saved = true;
    fireEvent(window, new Event('focus'));
    expect(await screen.findByRole('heading', { name: 'Cook now (1)' })).toBeInTheDocument();
  });
});

describe('flush on page leave (#14)', () => {
  it('pagehide sends the pending bulk with keepalive and the auth header', async () => {
    const user = userEvent.setup({ delay: null });
    render(<KitchenScreen />);
    await user.click(await screen.findByRole('button', { name: 'Eggs' }));
    expect(calls.some((c) => c.url.includes('/user/bulk'))).toBe(false); // still in the debounce window
    fireEvent(window, new Event('pagehide'));
    const bulk = calls.find((c) => c.url.includes('/user/bulk'));
    expect(bulk).toBeDefined();
    expect(bulk!.init?.keepalive).toBe(true);
    expect(JSON.parse(String(bulk!.init?.body))).toEqual({ add: [4] });
    expect((bulk!.init?.headers as Record<string, string>).Authorization).toBe('Bearer tok');
    // The debounce timer was cancelled: no second send.
    await act(async () => {
      await new Promise((r) => setTimeout(r, 500));
    });
    expect(calls.filter((c) => c.url.includes('/user/bulk'))).toHaveLength(1);
  });

  it('visibilitychange to hidden also flushes with keepalive', async () => {
    const user = userEvent.setup({ delay: null });
    render(<KitchenScreen />);
    await user.click(await screen.findByRole('button', { name: 'Eggs' }));
    const spy = vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('hidden');
    document.dispatchEvent(new Event('visibilitychange'));
    spy.mockRestore();
    expect(calls.find((c) => c.url.includes('/user/bulk'))?.init?.keepalive).toBe(true);
  });
});

const cookCss = readFileSync(resolve(__dirname, '../cook/Cook.css'), 'utf8');

describe('recipe placeholder (#15)', () => {
  it('centres the letter in the hero as well as the card', () => {
    const rule = (sel: string) =>
      new RegExp(`${sel.replace(/\./g, '\\.')}\\s*\\{([^}]*)\\}`).exec(cookCss)?.[1] ?? '';
    for (const sel of ['.cook-card-placeholder', '.cook-view-media.cook-card-placeholder']) {
      const body = rule(sel);
      expect(body, sel).toMatch(/display:\s*flex/);
      expect(body, sel).toMatch(/align-items:\s*center/);
      expect(body, sel).toMatch(/justify-content:\s*center/);
    }
  });
});
