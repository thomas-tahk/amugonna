import React, { useState, useEffect } from 'react';
import type { Recipe } from '../types';
import { recipesApi } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import './RecipeDetail.css';

interface RecipeDetailProps {
  recipeId: number;
  onBack: () => void;
  onEdit: (recipe: Recipe) => void;
  onDeleted: () => void;
  onRecipeLoaded?: (recipe: Recipe) => void;
}

const RecipeDetail: React.FC<RecipeDetailProps> = ({
  recipeId,
  onBack,
  onEdit,
  onDeleted,
  onRecipeLoaded,
}) => {
  const { user, token } = useAuth();
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [togglingFavorite, setTogglingFavorite] = useState(false);

  useEffect(() => {
    loadRecipe();
  }, [recipeId]);

  const loadRecipe = async () => {
    setIsLoading(true);
    setError(null);
    const response = await recipesApi.getRecipe(recipeId, token || undefined);
    if (response.success && response.data) {
      const loaded = response.data.recipe;
      setRecipe(loaded);
      onRecipeLoaded?.(loaded);
    } else {
      setError(response.message || 'Failed to load recipe');
    }
    setIsLoading(false);
  };

  const handleToggleFavorite = async () => {
    if (!recipe || togglingFavorite) return;
    setTogglingFavorite(true);
    const response = await recipesApi.toggleFavorite(recipe.id, token || undefined);
    if (response.success && response.data) {
      setRecipe(prev => prev ? { ...prev, isFavorite: response.data!.isFavorite } : prev);
    }
    setTogglingFavorite(false);
  };

  const handleDelete = async () => {
    if (!recipe || !window.confirm(`Delete "${recipe.title}"? This cannot be undone.`)) return;
    setIsDeleting(true);
    const response = await recipesApi.deleteRecipe(recipe.id, token || undefined);
    if (response.success) {
      onDeleted();
    } else {
      setError(response.message || 'Failed to delete recipe');
      setIsDeleting(false);
    }
  };

  const isOwner = recipe && user && recipe.createdBy === user.id;

  const formatTime = (minutes?: number) => {
    if (!minutes) return null;
    if (minutes < 60) return `${minutes}m`;
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
  };

  const renderInstructions = (instructions: string) => {
    const lines = instructions.split('\n').filter(l => l.trim());
    return lines.map((line, i) => (
      <p key={i} className="instruction-line">{line}</p>
    ));
  };

  if (isLoading) {
    return (
      <div className="recipe-detail">
        <button className="back-btn" onClick={onBack}>← Back</button>
        <div className="loading">Loading recipe...</div>
      </div>
    );
  }

  if (error || !recipe) {
    return (
      <div className="recipe-detail">
        <button className="back-btn" onClick={onBack}>← Back</button>
        <div className="error-message">{error || 'Recipe not found'}</div>
      </div>
    );
  }

  return (
    <div className="recipe-detail">
      <div className="detail-nav">
        <button className="back-btn" onClick={onBack}>← Back</button>
        <div className="detail-actions">
          <button
            className={`favorite-btn ${recipe.isFavorite ? 'is-favorite' : ''}`}
            onClick={handleToggleFavorite}
            disabled={togglingFavorite}
            title={recipe.isFavorite ? 'Remove from favorites' : 'Add to favorites'}
          >
            {recipe.isFavorite ? '♥' : '♡'}
          </button>
          {isOwner && (
            <>
              <button className="btn btn-secondary" onClick={() => onEdit(recipe)}>
                Edit
              </button>
              <button className="btn btn-danger" onClick={handleDelete} disabled={isDeleting}>
                {isDeleting ? 'Deleting...' : 'Delete'}
              </button>
            </>
          )}
        </div>
      </div>

      <div className="detail-header">
        <h2>{recipe.title}</h2>
        {recipe.description && <p className="detail-description">{recipe.description}</p>}

        <div className="detail-meta">
          {formatTime(recipe.prepTime) && (
            <span className="meta-chip">Prep: {formatTime(recipe.prepTime)}</span>
          )}
          {formatTime(recipe.cookTime) && (
            <span className="meta-chip">Cook: {formatTime(recipe.cookTime)}</span>
          )}
          <span className="meta-chip">{recipe.servings} servings</span>
          {recipe.difficulty && (
            <span className={`meta-chip difficulty-${recipe.difficulty}`}>
              {recipe.difficulty}
            </span>
          )}
        </div>

        {recipe.cuisineTypes.length > 0 && (
          <div className="tag-row">
            {recipe.cuisineTypes.map(c => (
              <span key={c} className="tag tag-cuisine">{c}</span>
            ))}
          </div>
        )}

        {recipe.dietaryTags.length > 0 && (
          <div className="tag-row">
            {recipe.dietaryTags.map(t => (
              <span key={t} className="tag tag-dietary">{t}</span>
            ))}
          </div>
        )}

        {recipe.tags.length > 0 && (
          <div className="tag-row">
            {recipe.tags.map(t => (
              <span key={t} className="tag">{t}</span>
            ))}
          </div>
        )}

        {recipe.sourceUrl && (
          <div className="source-info">
            Source: {recipe.sourceName || recipe.sourceUrl}
          </div>
        )}
      </div>

      <div className="detail-body">
        {recipe.recipeIngredients.length > 0 && (
          <section className="detail-section">
            <h3>Ingredients</h3>
            <ul className="ingredient-list">
              {recipe.recipeIngredients.map(ri => (
                <li key={ri.id} className={ri.optional ? 'optional' : ''}>
                  <span className="ingredient-amount">
                    {ri.quantity && `${ri.quantity} `}
                    {ri.unit && `${ri.unit} `}
                  </span>
                  <span className="ingredient-name">{ri.ingredient.name}</span>
                  {ri.preparationNote && (
                    <span className="prep-note">, {ri.preparationNote}</span>
                  )}
                  {ri.optional && <span className="optional-label"> (optional)</span>}
                </li>
              ))}
            </ul>
          </section>
        )}

        <section className="detail-section">
          <h3>Instructions</h3>
          <div className="instructions">
            {renderInstructions(recipe.instructions)}
          </div>
        </section>

        {recipe.personalNotes && (
          <section className="detail-section">
            <h3>Personal Notes</h3>
            <p className="personal-notes">{recipe.personalNotes}</p>
          </section>
        )}

        {recipe.modifications && (
          <section className="detail-section">
            <h3>Modifications</h3>
            <p className="modifications">{recipe.modifications}</p>
          </section>
        )}
      </div>
    </div>
  );
};

export default RecipeDetail;
