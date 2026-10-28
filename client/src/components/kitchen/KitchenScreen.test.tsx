import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import KitchenScreen from './KitchenScreen';

const item = (id: number, name: string) => ({ id, name, canonical: name.toLowerCase() });
const entry = (id: number, name: string) => ({
  id: id + 100,
  userId: 1,
  ingredientId: id,
  addedAt: '',
  ingredient: { id, name, category: null },
});

const COMMON = {
  groups: [
    { category: 'Produce', items: [item(1, 'Onion'), item(2, 'Garlic'), item(3, 'Tomato')] },
    { category: 'Dairy & eggs', items: [item(4, 'Eggs'), item(5, 'Butter')] },
  ],
  staples: [item(90, 'Water'), item(91, 'Salt'), item(92, 'Black pepper'), item(93, 'Cooking oil')],
};

type Json = Record<string, unknown>;
let pantry: ReturnType<typeof entry>[];
let calls: { url: string; method: string; body?: Json }[];
let bulkImpl: (body: Json) => Json | Promise<Json>;
// Deferred bulk: when `hold` is on, bulk requests wait here until released.
let hold: boolean;
let waiting: { body: Json; release: () => void }[];
let cookCount: number;
let suggestionsFail: boolean;
let holdSuggestions: boolean;
let suggestWaiting: (() => void)[];
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function ok(data: unknown) {
  return { json: async () => ({ success: true, data }) };
}

beforeEach(() => {
  pantry = [];
  calls = [];
  hold = false;
  waiting = [];
  cookCount = 12;
  suggestionsFail = false;
  holdSuggestions = false;
  suggestWaiting = [];
  bulkImpl = (body) => {
    const add = (body.add as (number | string)[] | undefined) ?? [];
    const remove = (body.remove as number[] | undefined) ?? [];
    const names: Record<number, string> = { 1: 'Onion', 2: 'Garlic', 3: 'Tomato', 4: 'Eggs', 5: 'Butter' };
    for (const a of add) {
      const id = typeof a === 'number' ? a : a === 'eggs' ? 4 : 50 + pantry.length;
      const name = typeof a === 'number' ? names[a] : a === 'eggs' ? 'Eggs' : a;
      if (!pantry.some((p) => p.ingredient.id === id)) pantry.push(entry(id, name));
    }
    pantry = pantry.filter((p) => !remove.includes(p.ingredient.id));
    return { success: true, data: { ingredients: pantry, resolved: [] } };
  };
  localStorage.setItem('authToken', 'tok');
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: string, init?: RequestInit) => {
      const url = String(input);
      const method = init?.method ?? 'GET';
      const body = init?.body ? (JSON.parse(String(init.body)) as Json) : undefined;
      calls.push({ url, method, body });
      if (url.includes('/ingredients/common')) return ok(COMMON);
      if (url.includes('/ingredients/suggest')) {
        return ok({ items: [{ ...item(5, 'Butter'), category: 'Dairy & eggs' }, { ...item(3, 'Tomato'), category: 'Produce' }] });
      }
      if (url.includes('/ingredients/user/parse')) {
        return ok({
          items: [
            { input: 'eggs', name: 'Eggs', canonical: 'egg', known: true, ingredientId: 4 },
            { input: 'scalions', name: 'Scalions', canonical: 'scalion', known: false, ingredientId: null },
          ],
        });
      }
      if (url.includes('/recipes/suggestions')) {
        if (suggestionsFail) return { json: async () => ({ success: false, message: 'nope' }) };
        if (holdSuggestions) {
          const n = cookCount; // the answer is fixed when the request is made (pantry as of then)
          return new Promise((resolve) =>
            suggestWaiting.push(() => resolve(ok({ cookNow: Array.from({ length: n }, (_, i) => ({ id: i })), oneAway: [], twoAway: [] }))),
          );
        }
        return ok({ pantrySize: pantry.length, totalRecipes: 100, cookNow: Array.from({ length: cookCount }, (_, i) => ({ id: i })), oneAway: [], twoAway: [] });
      }
      if (url.includes('/ingredients/user/bulk')) {
        if (hold) {
          return new Promise((resolve) =>
            waiting.push({ body: body!, release: () => resolve({ json: async () => bulkImpl(body!) }) }),
          );
        }
        return { json: async () => bulkImpl(body!) };
      }
      if (url.includes('/ingredients/user')) return ok({ ingredients: pantry });
      throw new Error(`unmocked ${url}`);
    }),
  );
});

afterEach(() => vi.unstubAllGlobals());

const bulkCalls = () => calls.filter((c) => c.url.includes('/user/bulk'));

describe('KitchenScreen', () => {
  it('shows an error with retry when loading fails', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ json: async () => ({ success: false, message: 'boom' }) })));
    render(<KitchenScreen />);
    expect(await screen.findByRole('alert')).toHaveTextContent(/boom/);
    expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument();
  });

  it('renders the groups, empty state, staples and sends the auth token', async () => {
    render(<KitchenScreen />);
    expect(await screen.findByRole('heading', { name: 'Produce' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'In your kitchen (0)' })).toBeInTheDocument();
    expect(screen.getByText('Always assumed: water, salt, black pepper, cooking oil')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Onion' })).toHaveAttribute('aria-pressed', 'false');
    const init = (fetch as unknown as ReturnType<typeof vi.fn>).mock.calls[0][1] as RequestInit;
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer tok');
  });

  it('ticking a common item sends bulk add with its id and marks it pressed; un-ticking removes', async () => {
    const user = userEvent.setup();
    render(<KitchenScreen />);
    const onion = await screen.findByRole('button', { name: 'Onion' });
    await user.click(onion);
    expect(onion).toHaveAttribute('aria-pressed', 'true'); // optimistic, before the call returns
    expect(screen.getByRole('heading', { name: 'In your kitchen (1)' })).toBeInTheDocument();
    await waitFor(() => expect(bulkCalls()).toHaveLength(1));
    expect(bulkCalls()[0].body).toEqual({ add: [1] });
    expect(onion).toHaveAttribute('aria-pressed', 'true');

    await user.click(onion);
    expect(onion).toHaveAttribute('aria-pressed', 'false');
    await waitFor(() => expect(bulkCalls()).toHaveLength(2));
    expect(bulkCalls()[1].body).toEqual({ remove: [1] });
    expect(screen.getByRole('heading', { name: 'In your kitchen (0)' })).toBeInTheDocument();
  });

  it('batches three rapid taps into one bulk call', async () => {
    const user = userEvent.setup();
    render(<KitchenScreen />);
    await user.click(await screen.findByRole('button', { name: 'Onion' }));
    await user.click(screen.getByRole('button', { name: 'Garlic' }));
    await user.click(screen.getByRole('button', { name: 'Eggs' }));
    await waitFor(() => expect(bulkCalls()).toHaveLength(1));
    expect(bulkCalls()[0].body).toEqual({ add: [1, 2, 4] });
  });

  it('removes from the kitchen list with the x button', async () => {
    pantry = [entry(2, 'Garlic')];
    const user = userEvent.setup();
    render(<KitchenScreen />);
    await user.click(await screen.findByRole('button', { name: 'Remove Garlic from your kitchen' }));
    await waitFor(() => expect(bulkCalls()).toHaveLength(1));
    expect(bulkCalls()[0].body).toEqual({ remove: [2] });
    expect(screen.getByRole('button', { name: 'Garlic' })).toHaveAttribute('aria-pressed', 'false');
  });

  it('reverts and shows an inline error when saving fails', async () => {
    bulkImpl = () => ({ success: false, message: 'Server is down' });
    const user = userEvent.setup();
    render(<KitchenScreen />);
    const onion = await screen.findByRole('button', { name: 'Onion' });
    await user.click(onion);
    expect(onion).toHaveAttribute('aria-pressed', 'true');
    expect(await screen.findByRole('alert')).toHaveTextContent(/Couldn't save that change.*Server is down/);
    expect(onion).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByRole('heading', { name: 'In your kitchen (0)' })).toBeInTheDocument();
  });

  it('free text: parse -> chips (unknown marked new) -> Add 2 -> bulk with both strings -> list updated', async () => {
    const user = userEvent.setup();
    render(<KitchenScreen />);
    const input = await screen.findByRole('combobox');
    await user.type(input, 'eggs, scalions{Enter}');
    const chips = await screen.findByRole('list', { name: 'Items to add' });
    expect(within(chips).getAllByRole('listitem')).toHaveLength(2);
    expect(within(chips).getByText('new')).toBeInTheDocument();
    expect(calls.some((c) => c.url.endsWith('/ingredients/user/parse') && (c.body as Json).text === 'eggs, scalions')).toBe(true);
    expect(bulkCalls()).toHaveLength(0); // nothing saved until confirmed

    await user.click(screen.getByRole('button', { name: 'Add 2' }));
    await waitFor(() => expect(bulkCalls()).toHaveLength(1));
    expect(bulkCalls()[0].body).toEqual({ add: [4, 'scalions'] });
    expect(await screen.findByRole('heading', { name: 'In your kitchen (2)' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Remove scalions from your kitchen' })).toBeInTheDocument();
    expect(screen.queryByRole('list', { name: 'Items to add' })).not.toBeInTheDocument();
  });

  it('dropping a confirm chip leaves it out of the bulk call', async () => {
    const user = userEvent.setup();
    render(<KitchenScreen />);
    await user.type(await screen.findByRole('combobox'), 'eggs, scalions{Enter}');
    await user.click(await screen.findByRole('button', { name: 'Remove Scalions' }));
    await user.click(screen.getByRole('button', { name: 'Add 1' }));
    await waitFor(() => expect(bulkCalls()).toHaveLength(1));
    expect(bulkCalls()[0].body).toEqual({ add: [4] });
  });

  it('type-ahead: arrow keys + Enter pick a suggestion by id', async () => {
    const user = userEvent.setup();
    render(<KitchenScreen />);
    await user.type(await screen.findByRole('combobox'), 'but');
    expect(await screen.findByRole('option', { name: /Butter/ })).toBeInTheDocument();
    await user.keyboard('{ArrowDown}{Enter}');
    await waitFor(() => expect(bulkCalls()).toHaveLength(1));
    expect(bulkCalls()[0].body).toEqual({ add: [5] });
    expect(calls.some((c) => c.url.includes('/parse'))).toBe(false);
    expect(screen.getByRole('button', { name: 'Butter' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('the CTA navigates to the Cook tab', async () => {
    const onNavigate = vi.fn();
    const user = userEvent.setup();
    render(<KitchenScreen onNavigate={onNavigate} />);
    await user.click(await screen.findByRole('button', { name: /See what I can cook/ }));
    expect(onNavigate).toHaveBeenCalledWith('cook');
  });

  it('tick then untick within the window sends nothing', async () => {
    const user = userEvent.setup();
    render(<KitchenScreen />);
    const onion = await screen.findByRole('button', { name: 'Onion' });
    await user.click(onion);
    await user.click(onion);
    await sleep(700);
    expect(bulkCalls()).toHaveLength(0);
    expect(onion).toHaveAttribute('aria-pressed', 'false');
  });

  it('flushes a pending batch when the screen unmounts', async () => {
    const user = userEvent.setup();
    const { unmount } = render(<KitchenScreen />);
    await user.click(await screen.findByRole('button', { name: 'Onion' }));
    unmount();
    await waitFor(() => expect(bulkCalls()).toHaveLength(1));
    expect(bulkCalls()[0].body).toEqual({ add: [1] });
  });

  it('the CTA shows Saving…, waits for pending saves, then navigates', async () => {
    hold = true;
    const onNavigate = vi.fn();
    const user = userEvent.setup();
    render(<KitchenScreen onNavigate={onNavigate} />);
    await user.click(await screen.findByRole('button', { name: 'Onion' }));
    await user.click(screen.getByRole('button', { name: /See what I can cook/ }));
    expect(screen.getByRole('button', { name: /Saving/ })).toBeInTheDocument();
    await waitFor(() => expect(waiting).toHaveLength(1)); // flushed immediately, not after 400ms
    expect(waiting[0].body).toEqual({ add: [1] });
    expect(onNavigate).not.toHaveBeenCalled();
    waiting.shift()!.release();
    await waitFor(() => expect(onNavigate).toHaveBeenCalledWith('cook'));
  });

  it('serializes writes: one request in flight, the next batch waits', async () => {
    hold = true;
    const user = userEvent.setup();
    render(<KitchenScreen />);
    await user.click(await screen.findByRole('button', { name: 'Onion' }));
    await waitFor(() => expect(waiting).toHaveLength(1));
    await user.click(screen.getByRole('button', { name: 'Garlic' }));
    await sleep(700);
    expect(waiting).toHaveLength(1); // second batch not sent yet
    waiting.shift()!.release();
    await waitFor(() => expect(waiting).toHaveLength(1));
    expect(waiting[0].body).toEqual({ add: [2] });
    waiting.shift()!.release();
    await waitFor(() => expect(screen.getByRole('heading', { name: 'In your kitchen (2)' })).toBeInTheDocument());
    expect(screen.getByRole('button', { name: 'Onion' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Garlic' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('free-text add is queued behind an in-flight toggle batch', async () => {
    hold = true;
    const user = userEvent.setup();
    render(<KitchenScreen />);
    await user.click(await screen.findByRole('button', { name: 'Onion' }));
    await waitFor(() => expect(waiting).toHaveLength(1));
    await user.type(screen.getByRole('combobox'), 'eggs, scalions{Enter}');
    await user.click(await screen.findByRole('button', { name: 'Add 2' }));
    await sleep(300);
    expect(waiting).toHaveLength(1);
    waiting.shift()!.release();
    await waitFor(() => expect(waiting).toHaveLength(1));
    expect(waiting[0].body).toEqual({ add: [4, 'scalions'] });
    waiting.shift()!.release();
    expect(await screen.findByRole('heading', { name: 'In your kitchen (3)' })).toBeInTheDocument();
  });

  it('typing filters the quick picks; clearing restores them', async () => {
    const user = userEvent.setup();
    render(<KitchenScreen />);
    const input = await screen.findByRole('combobox');
    await user.type(input, 'GAR');
    expect(screen.getByRole('button', { name: 'Garlic' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Onion' })).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Dairy & eggs' })).not.toBeInTheDocument();
    await user.clear(input);
    expect(screen.getByRole('button', { name: 'Onion' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Dairy & eggs' })).toBeInTheDocument();
  });

  it('the CTA shows the cook-now count and refreshes after saves settle', async () => {
    const user = userEvent.setup();
    render(<KitchenScreen />);
    expect(await screen.findByRole('button', { name: 'See what I can cook (12) →' })).toBeInTheDocument();
    cookCount = 3;
    await user.click(screen.getByRole('button', { name: 'Onion' }));
    expect(await screen.findByRole('button', { name: 'See what I can cook (3) →' })).toBeInTheDocument();
  });

  it('a count for an older pantry that resolves after a newer save never wins, and no stale count shows while saving', async () => {
    holdSuggestions = true;
    cookCount = 0; // pantry is empty: the first count request will answer 0
    const user = userEvent.setup();
    render(<KitchenScreen />);
    const cta = () => screen.getByRole('button', { name: /See what I can cook/ });
    await screen.findByRole('button', { name: 'Onion' });
    await waitFor(() => expect(suggestWaiting).toHaveLength(1)); // request A (empty pantry)
    expect(cta()).toHaveAttribute('aria-busy', 'true');
    suggestWaiting.shift()!(); // A resolves with 0 ...
    await waitFor(() => expect(cta()).toHaveAttribute('aria-busy', 'false'));
    expect(cta()).toHaveTextContent('See what I can cook (0) →');

    // ... then the person completes the pantry. While the save is pending/in flight the old 0 must not show.
    hold = true;
    cookCount = 7; // what the server would answer once the save has landed
    await user.click(screen.getByRole('button', { name: 'Onion' }));
    expect(cta()).toHaveAttribute('aria-busy', 'true');
    expect(cta()).not.toHaveTextContent('(0)');
    await waitFor(() => expect(waiting).toHaveLength(1));
    expect(cta()).toHaveAttribute('aria-busy', 'true');
    expect(cta()).not.toHaveTextContent('(');
    waiting.shift()!.release();

    // Count request B starts after the save settles (debounced); a response for an older pantry must be ignored.
    await waitFor(() => expect(suggestWaiting).toHaveLength(1));
    cookCount = 9;
    await user.click(screen.getByRole('button', { name: 'Garlic' })); // supersedes B
    expect(cta()).not.toHaveTextContent('(');
    suggestWaiting.shift()!(); // B (7) resolves late
    await sleep(50);
    expect(cta()).not.toHaveTextContent('(7)');
    await waitFor(() => expect(waiting).toHaveLength(1));
    waiting.shift()!.release();
    await waitFor(() => expect(suggestWaiting).toHaveLength(1)); // request C
    suggestWaiting.shift()!();
    expect(await screen.findByRole('button', { name: 'See what I can cook (9) →' })).toHaveAttribute('aria-busy', 'false');
  });

  it('shows no count when suggestions fail', async () => {
    suggestionsFail = true;
    render(<KitchenScreen />);
    expect(await screen.findByRole('button', { name: 'See what I can cook →' })).toBeInTheDocument();
  });

  it('Enter after typing more than a highlighted suggestion parses the typed text', async () => {
    const user = userEvent.setup();
    render(<KitchenScreen />);
    const input = await screen.findByRole('combobox');
    await user.type(input, 'but');
    await screen.findByRole('option', { name: /Butter/ });
    await user.keyboard('{ArrowDown}');
    await user.type(input, 'ter, eggs{Enter}');
    await waitFor(() => expect(calls.some((c) => c.url.includes('/user/parse'))).toBe(true));
    expect(calls.find((c) => c.url.includes('/user/parse'))!.body).toEqual({ text: 'butter, eggs' });
    expect(bulkCalls()).toHaveLength(0);
  });

  it('a failed save shows a toast, says so in the live region, and never says Added after the failure', async () => {
    bulkImpl = () => ({ success: false, message: 'Server is down' });
    const user = userEvent.setup();
    const { container } = render(<KitchenScreen />);
    await user.click(await screen.findByRole('button', { name: 'Onion' }));
    const toast = await screen.findByRole('alert');
    expect(toast).toHaveClass('kitchen-toast');
    expect(within(toast).getByRole('button', { name: 'Dismiss' })).toBeInTheDocument();
    await waitFor(() => expect(container.querySelector('[role=status]')?.textContent).toMatch(/Couldn't save Onion/));
    expect(container.querySelector('[role=status]')?.textContent).not.toMatch(/^Added/);
    await user.click(within(toast).getByRole('button', { name: 'Dismiss' }));
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('a network failure on save uses plain language', async () => {
    const user = userEvent.setup();
    render(<KitchenScreen />);
    const onion = await screen.findByRole('button', { name: 'Onion' });
    const real = fetch as unknown as ReturnType<typeof vi.fn>;
    vi.stubGlobal('fetch', vi.fn(async (u: string, i?: RequestInit) => (String(u).includes('/user/bulk') ? Promise.reject(new TypeError('Failed to fetch')) : real(u, i))));
    await user.click(onion);
    expect(await screen.findByRole('alert')).toHaveTextContent("Can't reach Amugonna. Check your connection and try again.");
  });

  it('focus: heading after load, confirm heading after Check, the input after Add; the sticky CTA hides while confirming', async () => {
    const user = userEvent.setup();
    const { container } = render(<KitchenScreen />);
    await screen.findByRole('heading', { name: 'Produce' });
    await waitFor(() => expect(screen.getByRole('heading', { name: 'Your kitchen' })).toHaveFocus());
    const input = screen.getByRole('combobox', { name: /add ingredients/i });
    await user.type(input, 'eggs, scalions');
    await user.click(screen.getByRole('button', { name: 'Check' }));
    const heading = await screen.findByRole('heading', { name: /Here is what we found/ });
    expect(heading).toHaveFocus();
    expect(container.querySelector('.kitchen')).toHaveAttribute('data-confirming', 'true');
    await user.click(screen.getByRole('button', { name: 'Add 2' }));
    await waitFor(() => expect(input).toHaveFocus());
    expect(container.querySelector('.kitchen')).toHaveAttribute('data-confirming', 'false');
  });

  it('Cancel returns focus to the input', async () => {
    const user = userEvent.setup();
    render(<KitchenScreen />);
    const input = await screen.findByRole('combobox', { name: /add ingredients/i });
    await user.type(input, 'eggs');
    await user.click(screen.getByRole('button', { name: 'Check' }));
    await user.click(await screen.findByRole('button', { name: 'Cancel' }));
    expect(input).toHaveFocus();
  });

  it('a 400 on add says to try a shorter name', async () => {
    const real = fetch as unknown as ReturnType<typeof vi.fn>;
    const user = userEvent.setup();
    render(<KitchenScreen />);
    const input = await screen.findByRole('combobox', { name: /add ingredients/i });
    await user.type(input, 'eggs');
    await user.click(screen.getByRole('button', { name: 'Check' }));
    vi.stubGlobal('fetch', vi.fn(async (u: string, i?: RequestInit) =>
      String(u).includes('/user/bulk') ? { status: 400, json: async () => ({ success: false, message: 'Validation failed' }) } : real(u, i)));
    await user.click(await screen.findByRole('button', { name: /^Add \d/ }));
    expect(await screen.findByRole('alert')).toHaveTextContent("Couldn't add that. Try a shorter name.");
  });
});
