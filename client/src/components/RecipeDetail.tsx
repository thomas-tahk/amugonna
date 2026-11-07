import React, { useState, useEffect } from 'react';
import type { Recipe } from '../types';
import { recipesApi } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { navigate, recipeHash } from './shell/route';
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
  const [notes, setNotes] = useState('');
  const [savingNotes, setSavingNotes] = useState(false);
  const [actionMessage, setActionMessage] = useState('');

  useEffect(() => {
    loadRecipe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recipeId]);

  const loadRecipe = async () => {
    setIsLoading(true);
    setError(null);
    const response = await recipesApi.getRecipe(recipeId, token || undefined);
    if (response.success && response.data) {
      const loaded = response.data.recipe;
      setRecipe(loaded);
      setNotes(loaded.personalNotes || '');
      onRecipeLoaded?.(loaded);
    } else {
      setError(response.message || 'Failed to load recipe');
    }
    setIsLoading(false);
  };

  const handleToggleFavorite = async () => {
    if (!recipe || togglingFavorite) return;
    setTogglingFavorite(true);
    setActionMessage('');
    const response = await recipesApi.toggleFavorite(recipe.id, token || undefined);
    if (response.success && response.data) {
      setRecipe(prev => prev ? { ...prev, isFavorite: response.data!.isFavorite } : prev);
    } else setActionMessage(response.message || 'Could not update favorite. Try again.');
    setTogglingFavorite(false);
  };

  const handleSaveNotes = async () => {
    if (!recipe || savingNotes) return;
    setSavingNotes(true);
    setActionMessage('');
    const response = await recipesApi.saveNotes(recipe.id, notes, token || undefined);
    if (response.success && response.data) {
      setRecipe(current => current ? { ...current, personalNotes: response.data!.personalNotes } : current);
      setActionMessage('Notes saved');
    } else setActionMessage(response.message || 'Could not save notes. Try again.');
    setSavingNotes(false);
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
        <div className="loading" role="status">Loading recipe...</div>
      </div>
    );
  }

  if (error || !recipe) {
    return (
      <div className="recipe-detail">
        <button className="back-btn" onClick={onBack}>← Back</button>
        <div className="error-message" role="alert">{error || 'Recipe not found'} <button className="link-btn" onClick={loadRecipe}>Try again</button></div>
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
            aria-label={recipe.isFavorite ? 'Remove from favorites' : 'Add to favorites'}
          >
            {recipe.isFavorite ? '♥' : '♡'}
          </button>
          <button type="button" className="btn btn-secondary" onClick={() => navigate(recipeHash(recipe.id))}>Cook this recipe</button>
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

      {actionMessage && <p className="detail-action-message" role={actionMessage === 'Notes saved' ? 'status' : 'alert'}>{actionMessage}</p>}

      <div className="detail-header">
        <h2>{recipe.title}</h2>
        {recipe.koreanTitle && <p className="recipe-korean-title" lang="ko">{recipe.koreanTitle}</p>}
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

        {(recipe.sourceUrl || recipe.sourceName) && (
          <div className="source-info">
            Source: {recipe.sourceUrl
              ? <a href={recipe.sourceUrl} target="_blank" rel="noreferrer">{recipe.sourceName || recipe.sourceUrl}</a>
              : recipe.sourceName}
          </div>
        )}
      </div>

      {!!recipe.ingredientReview?.blocked.length && (
        <p className="error-message" role="alert">
          Contains foods you avoid: {recipe.ingredientReview.blocked.join(', ')}. This recipe is excluded from your recommendations.
        </p>
      )}
      {!!recipe.ingredientReview?.uncertain.length && (
        <p className="error-message" role="alert">
          Check ingredients before cooking: {recipe.ingredientReview.uncertain.join(', ')}. Their contents could conflict with your exclusions.
        </p>
      )}

      <div className="detail-body">
        {recipe.recipeIngredients.length > 0 && (
          <section className="detail-section">
            <h3>Ingredients</h3>
            <ul className="ingredient-list">
              {recipe.recipeIngredients.map(ri => {
                const measure = ri.measure || [ri.quantity, ri.unit]
                  .filter(value => value !== undefined && value !== null && value !== '')
                  .join(' ');
                return <li key={ri.id} className={ri.optional ? 'optional' : ''}>
                  <span className="ingredient-amount">{measure && `${measure} `}</span>
                  <span className="ingredient-name">{ri.ingredient.name}</span>
                  {ri.rawText && <span className="prep-note"> (Source wording: {ri.rawText})</span>}
                  {ri.preparationNote && <span className="prep-note">, {ri.preparationNote}</span>}
                  {ri.optional && <span className="optional-label"> (optional)</span>}
                </li>;
              })}
            </ul>
          </section>
        )}

        <section className="detail-section">
          <h3>Instructions</h3>
          <div className="instructions">
            {renderInstructions(recipe.instructions)}
          </div>
        </section>

        <section className="detail-section notes-editor">
          <h3>Personal notes</h3>
          <label htmlFor="personal-notes">Notes for your account</label>
          <textarea id="personal-notes" aria-label="Personal notes" value={notes} onChange={event => setNotes(event.target.value)} rows={4} />
          <button type="button" className="btn btn-secondary" onClick={handleSaveNotes} disabled={savingNotes}>
            {savingNotes ? 'Saving…' : 'Save notes'}
          </button>
        </section>

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
