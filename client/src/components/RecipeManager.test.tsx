import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import RecipeManager from './RecipeManager';
import { AuthProvider } from '../contexts/AuthContext';

// Unmocked on purpose: the real recipesApi/apiRequest run against a fetch that
// returns the real GET /api/recipes shape, so a shape mismatch shows up here.
const recipe = (id: number, title: string) => ({
  id,
  title,
  description: 'tasty',
  instructions: 'cook',
  servings: 2,
  images: [],
  cuisineTypes: ['Italian'],
  tags: [],
  dietaryTags: [],
  allergens: [],
  timesCooked: 0,
  isPublic: false,
  createdBy: 1,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  recipeIngredients: [{ id: 1 }, { id: 2 }],
  _count: { favoriteRecipes: 0 },
});

describe('RecipeManager', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('renders my recipes from the real /api/recipes shape (no infinite spinner)', async () => {
    const fetchMock = vi.fn<(url: string) => Promise<Response>>(
      async () =>
        new Response(
          JSON.stringify({
            success: true,
            data: {
              recipes: [recipe(1, 'Garlic Chicken'), recipe(2, 'Egg Fried Rice')],
              pagination: { page: 1, limit: 50, total: 2, pages: 1 },
            },
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        )
    );
    vi.stubGlobal('fetch', fetchMock);

    render(
      <AuthProvider>
        <RecipeManager />
      </AuthProvider>
    );

    expect(await screen.findByText('Garlic Chicken')).toBeInTheDocument();
    expect(screen.getByText('Egg Fried Rice')).toBeInTheDocument();
    expect(screen.queryByText(/Loading/)).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Suggestions' })).not.toBeInTheDocument();
    const urls = fetchMock.mock.calls.map((c) => String(c[0]));
    expect(urls.some((u) => u.includes('/recipes/suggestions'))).toBe(false);
  });
});
