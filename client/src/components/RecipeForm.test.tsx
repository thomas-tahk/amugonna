import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import RecipeForm from './RecipeForm';
import type { Recipe } from '../types';

vi.mock('../contexts/AuthContext', () => ({ useAuth: () => ({ token: 'test-token' }) }));

const recipe: Recipe = {
  id: 17,
  title: 'Kimchi stew',
  koreanTitle: '김치찌개',
  instructions: 'Simmer the stew.',
  servings: 4,
  images: [],
  cuisineTypes: [],
  tags: [],
  dietaryTags: [],
  allergens: [],
  timesCooked: 0,
  isPublic: false,
  createdBy: 1,
  createdAt: '',
  updatedAt: '',
  recipeIngredients: [{
    id: 1,
    ingredient: { id: 2, name: 'Rice', category: 'Grain', commonUnits: ['cup'] },
    rawText: '1 cup rice',
    measure: '1 cup',
    quantity: null,
    unit: null,
    optional: false,
    substitutions: [],
  }],
};

afterEach(() => vi.unstubAllGlobals());

describe('RecipeForm imported ingredients', () => {
  it('keeps source wording and measure on a title-only edit, with editable Korean title', async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn<(url: string, options?: RequestInit) => Promise<Response>>(async () => new Response(JSON.stringify({ success: true, data: { recipe } })));
    vi.stubGlobal('fetch', fetchMock);
    render(<RecipeForm recipe={recipe} onSaved={() => {}} onCancel={() => {}} />);

    expect(screen.getByText('Rice', { exact: true }).parentElement).toHaveTextContent('Rice (1 cup)');
    expect(screen.getByLabelText('Korean title')).toHaveValue('김치찌개');
    await user.clear(screen.getByLabelText('Title *'));
    await user.type(screen.getByLabelText('Title *'), 'Updated kimchi stew');
    await user.click(screen.getByRole('button', { name: 'Save Changes' }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    const payload = JSON.parse(String(fetchMock.mock.calls[0][1]?.body));
    expect(payload.koreanTitle).toBe('김치찌개');
    expect(payload.ingredients[0]).toMatchObject({ rawText: '1 cup rice', measure: '1 cup' });
  });

  it('updates display measure when amount changes while preserving source wording', async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn<(url: string, options?: RequestInit) => Promise<Response>>(async () => new Response(JSON.stringify({ success: true, data: { recipe } })));
    vi.stubGlobal('fetch', fetchMock);
    const { container } = render(<RecipeForm recipe={recipe} onSaved={() => {}} onCancel={() => {}} />);

    await user.clear(screen.getByPlaceholderText('Qty'));
    await user.type(screen.getByPlaceholderText('Qty'), '2');
    await user.selectOptions(container.querySelector('select.ing-unit')!, 'cup');
    await user.click(screen.getByRole('button', { name: 'Save Changes' }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    const payload = JSON.parse(String(fetchMock.mock.calls[0][1]?.body));
    expect(payload.ingredients[0]).toMatchObject({ rawText: '1 cup rice', measure: '2 cup', quantity: 2, unit: 'cup' });
  });

  it('handles null source quantities and lets the Korean subtitle be cleared', async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn<(url: string, options?: RequestInit) => Promise<Response>>(async () => new Response(JSON.stringify({ success: true, data: { recipe } })));
    vi.stubGlobal('fetch', fetchMock);
    const { container } = render(<RecipeForm recipe={recipe} onSaved={() => {}} onCancel={() => {}} />);
    await user.selectOptions(container.querySelector('select.ing-unit')!, 'cup');
    await user.clear(screen.getByLabelText('Korean title'));
    await user.click(screen.getByRole('button', { name: 'Save Changes' }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    const payload = JSON.parse(String(fetchMock.mock.calls[0][1]?.body));
    expect(payload.ingredients[0].measure).toBe('cup');
    expect(payload.koreanTitle).toBe('');
  });
});
