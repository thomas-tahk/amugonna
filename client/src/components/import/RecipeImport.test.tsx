import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { StrictMode } from 'react';
import RecipeImport from './RecipeImport';
import { AuthProvider } from '../../contexts/AuthContext';

const draft = {
  title: 'Ginger rice',
  description: 'A quick bowl',
  ingredients: ['1 cup rice', '1 tbsp ginger'],
  instructions: 'Rinse rice.\nCook with ginger.',
  sourceUrl: '',
  sourceName: '',
  cuisineTypes: ['Korean'],
  prepTime: 5,
  cookTime: 20,
  servings: 2,
};

describe('RecipeImport', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('previews pasted text, lets the user edit it, then saves only after explicit action', async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn(async (url: string, options?: RequestInit) => {
      if (url.endsWith('/recipe-imports') && options?.method === 'POST') {
        return new Response(JSON.stringify({ success: true, data: { recipe: { id: 41 } } }));
      }
      return new Response(JSON.stringify({ success: true, data: { draft, warnings: [] } }));
    });
    vi.stubGlobal('fetch', fetchMock);
    const onSaved = vi.fn();
    render(<AuthProvider><RecipeImport onSaved={onSaved} onCancel={() => {}} /></AuthProvider>);

    await user.type(screen.getByLabelText('Recipe text'), 'Ingredients\n1 cup rice');
    await user.click(screen.getByRole('button', { name: 'Preview recipe' }));
    const title = await screen.findByLabelText('Title', { exact: true });
    await user.clear(title);
    await user.type(title, 'My ginger rice');

    expect(fetchMock).toHaveBeenCalledTimes(1);
    await user.click(screen.getByRole('button', { name: 'Save privately' }));
    await waitFor(() => expect(onSaved).toHaveBeenCalledWith(41));
    const saveBody = JSON.parse(String(fetchMock.mock.calls[1][1]?.body));
    expect(saveBody.draft.title).toBe('My ginger rice');
    expect(saveBody.draft.cuisineTypes).toEqual(['Korean']);
  });

  it('auto-previews an initial URL once and keeps its Korean title editable', async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn(async (url: string, options?: RequestInit) => {
      const isSave = url.endsWith('/recipe-imports') && options?.method === 'POST';
      const data = isSave ? { recipe: { id: 41 } } : { draft, warnings: [] };
      return new Response(JSON.stringify({ success: true, data }));
    });
    vi.stubGlobal('fetch', fetchMock);
    const onSaved = vi.fn();
    render(<StrictMode><AuthProvider><RecipeImport
      initialUrl="https://example.com/kimchi-stew"
      initialKoreanTitle="김치찌개"
      onSaved={onSaved}
      onCancel={() => {}}
    /></AuthProvider></StrictMode>);

    expect(await screen.findByLabelText('Korean title')).toHaveValue('김치찌개');
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    const previewBody = JSON.parse(String(fetchMock.mock.calls[0][1]?.body));
    expect(previewBody).toEqual({ url: 'https://example.com/kimchi-stew' });
    await user.click(screen.getByRole('button', { name: 'Save privately' }));
    await waitFor(() => expect(onSaved).toHaveBeenCalledWith(41));
    const saveBody = JSON.parse(String(fetchMock.mock.calls[1][1]?.body));
    expect(saveBody.draft.koreanTitle).toBe('김치찌개');
  });
});
