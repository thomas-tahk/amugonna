import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import RecipeDetail from './RecipeDetail';

vi.mock('../contexts/AuthContext', () => ({ useAuth: () => ({ token: 'test-token', user: { id: 1 } }) }));

afterEach(() => vi.unstubAllGlobals());

describe('RecipeDetail ingredient review', () => {
  it('warns about ingredients blocked by exclusions and ingredients needing label review', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({
      success: true,
      data: { recipe: {
        id: 17, title: 'Kimchi stew', instructions: 'Simmer.', servings: 4, images: [], cuisineTypes: [],
        tags: [], dietaryTags: [], allergens: [], timesCooked: 0, isPublic: false, createdBy: 1, createdAt: '', updatedAt: '',
        recipeIngredients: [], isFavorite: false,
        ingredientReview: { blocked: ['milk'], uncertain: ['kimchi'] },
      } },
    }))));
    render(<RecipeDetail recipeId={17} onBack={() => {}} onEdit={() => {}} onDeleted={() => {}} />);

    const warnings = await screen.findAllByRole('alert');
    expect(warnings[0]).toHaveTextContent(/Contains foods you avoid: milk/);
    expect(warnings[1]).toHaveTextContent(/Check ingredients before cooking: kimchi/);
  });
});
