import React, { useState, useEffect } from 'react';
import type { Recipe } from '../types';
import { recipesApi } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import RecipeDetail from './RecipeDetail';
import RecipeForm from './RecipeForm';
import './RecipeManager.css';

type ViewState =
  | { mode: 'list'; tab: 'my-recipes' }
  | { mode: 'detail'; recipeId: number }
  | { mode: 'create' }
  | { mode: 'edit'; recipe: Recipe };

const RecipeManager: React.FC = () => {
  const { token } = useAuth();
  const [view, setView] = useState<ViewState>({ mode: 'list', tab: 'my-recipes' });

  // My recipes state
  const [myRecipes, setMyRecipes] = useState<Recipe[]>([]);
  const [myRecipesLoading, setMyRecipesLoading] = useState(false);
  const [myRecipesError, setMyRecipesError] = useState<string | null>(null);
  const [myRecipesTotal, setMyRecipesTotal] = useState(0);

  const activeTab = view.mode === 'list' ? view.tab : null;

  useEffect(() => {
    if (view.mode === 'list' && view.tab === 'my-recipes') {
      loadMyRecipes();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view]);

  const loadMyRecipes = async () => {
    setMyRecipesLoading(true);
    setMyRecipesError(null);
    const response = await recipesApi.getRecipes({ limit: 50 }, token || undefined);
    if (response.success && response.data) {
      setMyRecipes(response.data.recipes as Recipe[]);
      setMyRecipesTotal(response.data.pagination.total);
    } else {
      setMyRecipesError(response.message || 'Failed to load recipes');
    }
    setMyRecipesLoading(false);
  };

  const handleRecipeSaved = (recipe: Recipe) => {
    setView({ mode: 'detail', recipeId: recipe.id });
    // Invalidate caches so next tab visit reloads
    setMyRecipes([]);
  };

  const handleDeleted = () => {
    setView({ mode: 'list', tab: 'my-recipes' });
    setMyRecipes([]);
  };

  const formatTime = (minutes?: number) => {
    if (!minutes) return null;
    if (minutes < 60) return `${minutes}m`;
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
  };

  const renderMyRecipeCard = (r: Recipe) => (
    <div key={r.id} className="recipe-card" onClick={() => setView({ mode: 'detail', recipeId: r.id })}>
      <div className="card-top">
        {r.isFavorite && <span className="fav-indicator">♥</span>}
        {r.isPublic && <span className="public-badge">public</span>}
      </div>
      <h4 className="card-title">{r.title}</h4>
      {r.description && <p className="card-desc">{r.description}</p>}
      <div className="card-meta">
        {formatTime(r.prepTime) && <span>{formatTime(r.prepTime)} prep</span>}
        {formatTime(r.cookTime) && <span>{formatTime(r.cookTime)} cook</span>}
        {r.difficulty && <span>{r.difficulty}</span>}
        {r.recipeIngredients && (
          <span>{r.recipeIngredients.length} ingredient{r.recipeIngredients.length !== 1 ? 's' : ''}</span>
        )}
      </div>
      {r.cuisineTypes?.length > 0 && (
        <div className="card-tags">
          {r.cuisineTypes.slice(0, 2).map(c => (
            <span key={c} className="card-tag tag-cuisine">{c}</span>
          ))}
        </div>
      )}
    </div>
  );

  // ── Detail view ──
  if (view.mode === 'detail') {
    return (
      <RecipeDetail
        recipeId={view.recipeId}
        onBack={() => setView({ mode: 'list', tab: 'my-recipes' })}
        onEdit={recipe => setView({ mode: 'edit', recipe })}
        onDeleted={handleDeleted}
      />
    );
  }

  // ── Create/Edit form ──
  if (view.mode === 'create' || view.mode === 'edit') {
    return (
      <RecipeForm
        recipe={view.mode === 'edit' ? view.recipe : undefined}
        onSaved={handleRecipeSaved}
        onCancel={() => {
          if (view.mode === 'edit') {
            setView({ mode: 'detail', recipeId: view.recipe.id });
          } else {
            setView({ mode: 'list', tab: 'my-recipes' });
          }
        }}
      />
    );
  }

  // ── List view ──
  return (
    <div className="recipe-manager">
      <div className="tab-bar">
        <button
          className={`tab-btn ${activeTab === 'my-recipes' ? 'active' : ''}`}
          onClick={() => setView({ mode: 'list', tab: 'my-recipes' })}
        >
          My Recipes {myRecipesTotal > 0 && <span className="count-badge">{myRecipesTotal}</span>}
        </button>
        <button
          className="tab-btn new-recipe-btn"
          onClick={() => setView({ mode: 'create' })}
        >
          + New Recipe
        </button>
      </div>

      {/* ── My Recipes tab ── */}
      {activeTab === 'my-recipes' && (
        <div className="tab-content">
          {myRecipesLoading && <div className="loading">Loading your recipes...</div>}
          {myRecipesError && <div className="error-message">{myRecipesError}</div>}

          {!myRecipesLoading && !myRecipesError && myRecipes.length === 0 && (
            <div className="empty-state">
              You haven't added any recipes yet.{' '}
              <button className="link-btn" onClick={() => setView({ mode: 'create' })}>
                Create your first recipe
              </button>
            </div>
          )}

          {myRecipes.length > 0 && (
            <div className="recipe-grid">
              {myRecipes.map(renderMyRecipeCard)}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default RecipeManager;
