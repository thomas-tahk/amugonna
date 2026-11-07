import React, { useEffect, useState } from 'react';
import type { Recipe } from '../types';
import { recipesApi } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import RecipeDetail from './RecipeDetail';
import RecipeForm from './RecipeForm';
import RecipeImport from './import/RecipeImport';
import KoreanShelf, { type KoreanSource } from './KoreanShelf';
import './RecipeManager.css';

type Collection = 'my-recipes' | 'favorites' | 'korean-shelf';
type ViewState =
  | { mode: 'list'; tab: Collection }
  | { mode: 'detail'; recipeId: number; returnTo: Collection }
  | { mode: 'create' }
  | { mode: 'import'; returnTo: Collection; initialUrl?: string; initialKoreanTitle?: string }
  | { mode: 'edit'; recipe: Recipe; returnTo: Collection };

const formatTime = (minutes?: number) => {
  if (!minutes) return null;
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const remaining = minutes % 60;
  return remaining ? `${hours}h ${remaining}m` : `${hours}h`;
};

const RecipeManager: React.FC = () => {
  const { token } = useAuth();
  const [view, setView] = useState<ViewState>({ mode: 'list', tab: 'my-recipes' });
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);
  const activeTab = view.mode === 'list' ? view.tab : null;

  useEffect(() => {
    if (view.mode === 'list' && view.tab !== 'korean-shelf') void loadRecipes(view.tab);
    // List selection is the only trigger; auth token stays stable while mounted.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view]);

  const loadRecipes = async (collection: Exclude<Collection, 'korean-shelf'>) => {
    setLoading(true);
    setError(null);
    const response = await recipesApi.getRecipes(
      { limit: 50, ...(collection === 'favorites' && { collection: 'favorites' }) },
      token || undefined
    );
    if (response.success && response.data) {
      setRecipes(response.data.recipes);
      setTotal(response.data.pagination.total);
    } else setError(response.message || 'Could not load recipes. Try again.');
    setLoading(false);
  };

  const openRecipe = (recipeId: number) => setView({
    mode: 'detail', recipeId, returnTo: activeTab || 'my-recipes',
  });

  const handleRecipeSaved = (recipe: Recipe, returnTo: Collection = 'my-recipes') => {
    setRecipes([]);
    setView({ mode: 'detail', recipeId: recipe.id, returnTo });
  };

  const renderRecipeCard = (recipe: Recipe) => (
    <button key={recipe.id} type="button" className="recipe-card" onClick={() => openRecipe(recipe.id)}>
      <span className="card-top">
        {recipe.isFavorite && <span className="fav-indicator" aria-label="Favorite">♥</span>}
        {recipe.isPublic && <span className="public-badge">public</span>}
      </span>
      <span className="card-title">{recipe.title}</span>
      {recipe.koreanTitle && <span className="recipe-korean-title" lang="ko">{recipe.koreanTitle}</span>}
      {recipe.description && <span className="card-desc">{recipe.description}</span>}
      <span className="card-meta">
        {formatTime(recipe.prepTime) && <span>{formatTime(recipe.prepTime)} prep</span>}
        {formatTime(recipe.cookTime) && <span>{formatTime(recipe.cookTime)} cook</span>}
        {recipe.recipeIngredients && <span>{recipe.recipeIngredients.length} ingredients</span>}
      </span>
      {recipe.sourceName && <span className="card-source">From {recipe.sourceName}</span>}
      {recipe.cuisineTypes.length > 0 && <span className="card-tags">
        {recipe.cuisineTypes.slice(0, 2).map(cuisine => <span key={cuisine} className="card-tag tag-cuisine">{cuisine}</span>)}
      </span>}
    </button>
  );

  if (view.mode === 'detail') return <RecipeDetail
    recipeId={view.recipeId}
    onBack={() => setView({ mode: 'list', tab: view.returnTo })}
    onEdit={recipe => setView({ mode: 'edit', recipe, returnTo: view.returnTo })}
    onDeleted={() => { setRecipes([]); setView({ mode: 'list', tab: 'my-recipes' }); }}
  />;

  if (view.mode === 'create' || view.mode === 'edit') return <RecipeForm
    recipe={view.mode === 'edit' ? view.recipe : undefined}
    onSaved={recipe => handleRecipeSaved(recipe, view.mode === 'edit' ? view.returnTo : 'my-recipes')}
    onCancel={() => setView(view.mode === 'edit'
      ? { mode: 'detail', recipeId: view.recipe.id, returnTo: view.returnTo }
      : { mode: 'list', tab: 'my-recipes' })}
  />;

  if (view.mode === 'import') return <RecipeImport
    initialUrl={view.initialUrl}
    initialKoreanTitle={view.initialKoreanTitle}
    onSaved={id => {
      setRecipes([]);
      setView({ mode: 'detail', recipeId: id, returnTo: view.returnTo });
    }}
    onCancel={() => setView({ mode: 'list', tab: view.returnTo })}
  />;

  const favorites = view.tab === 'favorites';
  const isKoreanShelf = view.tab === 'korean-shelf';
  const previewKoreanSource = (source: KoreanSource) => setView({
    mode: 'import', returnTo: 'korean-shelf', initialUrl: source.url, initialKoreanTitle: source.korean,
  });
  return <div className="recipe-manager">
    <div className="recipe-library-heading">
      <div><h2>My recipes</h2><p>Recipes you keep close, including favorites.</p></div>
      <div className="library-actions">
        <button type="button" className="new-recipe-btn" onClick={() => setView({ mode: 'import', returnTo: 'my-recipes' })}>Import recipe</button>
        <button type="button" className="new-recipe-btn" onClick={() => setView({ mode: 'create' })}>+ New recipe</button>
      </div>
    </div>
    <div className="tab-bar" role="tablist" aria-label="Recipe collections">
      <button type="button" role="tab" aria-selected={!favorites} className={`tab-btn ${!favorites ? 'active' : ''}`} onClick={() => setView({ mode: 'list', tab: 'my-recipes' })}>
        My recipes {!favorites && total > 0 && <span className="count-badge">{total}</span>}
      </button>
      <button type="button" role="tab" aria-selected={favorites} className={`tab-btn ${favorites ? 'active' : ''}`} onClick={() => setView({ mode: 'list', tab: 'favorites' })}>
        Favorites {favorites && total > 0 && <span className="count-badge">{total}</span>}
      </button>
      <button type="button" role="tab" aria-selected={isKoreanShelf} className={`tab-btn ${isKoreanShelf ? 'active' : ''}`} onClick={() => setView({ mode: 'list', tab: 'korean-shelf' })}>
        Korean shelf
      </button>
    </div>
    <div className="tab-content" role="tabpanel" aria-label={isKoreanShelf ? 'Korean recipe shelf' : favorites ? 'Favorites' : 'My recipes'}>
      {isKoreanShelf && <KoreanShelf onPreview={previewKoreanSource} />}
      {!isKoreanShelf && <>
      {loading && <div className="loading" role="status">Loading {favorites ? 'favorites' : 'your recipes'}…</div>}
      {error && <div className="error-message" role="alert">{error}<button className="link-btn" onClick={() => void loadRecipes(favorites ? 'favorites' : 'my-recipes')}>Try again</button></div>}
      {!loading && !error && recipes.length === 0 && <div className="empty-state">
        {favorites ? <>No favorites yet. Open a recipe and choose “Add to favorites.”</> : <>No personal recipes yet. Import a recipe or create one to get started.</>}
      </div>}
      {!loading && recipes.length > 0 && <div className="recipe-grid">{recipes.map(renderRecipeCard)}</div>}
      </>}
    </div>
  </div>;
};

export default RecipeManager;
