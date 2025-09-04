import React, { useState } from 'react';
import type { UserIngredient, Recipe, RecipeGenerationRequest } from '../types';
import { recipesApi } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import './RecipeGenerator.css';

interface RecipeGeneratorProps {
  userIngredients: UserIngredient[];
}

const RecipeGenerator: React.FC<RecipeGeneratorProps> = ({ userIngredients }) => {
  const { token } = useAuth();
  const [selectedIngredients, setSelectedIngredients] = useState<number[]>([]);
  const [cuisine, setCuisine] = useState<string>('');
  const [servings, setServings] = useState<number>(4);
  const [maxPrepTime, setMaxPrepTime] = useState<number | undefined>();
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedRecipe, setGeneratedRecipe] = useState<Recipe | null>(null);
  const [error, setError] = useState<string | null>(null);

  const cuisineOptions = [
    '', 'Italian', 'Mexican', 'Chinese', 'Indian', 'Mediterranean', 
    'American', 'Thai', 'Japanese', 'French', 'Middle Eastern'
  ];

  const handleIngredientToggle = (ingredientId: number) => {
    setSelectedIngredients(prev => 
      prev.includes(ingredientId) 
        ? prev.filter(id => id !== ingredientId)
        : [...prev, ingredientId]
    );
  };

  const handleSelectAll = () => {
    if (selectedIngredients.length === userIngredients.length) {
      setSelectedIngredients([]);
    } else {
      setSelectedIngredients(userIngredients.map(ui => ui.ingredientId));
    }
  };

  const handleGenerateRecipe = async () => {
    if (selectedIngredients.length === 0) {
      setError('Please select at least one ingredient');
      return;
    }

    if (!token) {
      setError('Authentication required');
      return;
    }

    setIsGenerating(true);
    setError(null);
    setGeneratedRecipe(null);

    try {
      const request: RecipeGenerationRequest = {
        ingredientIds: selectedIngredients,
        cuisine: cuisine || undefined,
        servings,
        maxPrepTime
      };

      const response = await recipesApi.generate(request, token);

      if (response.success && response.data) {
        setGeneratedRecipe(response.data.recipe);
      } else {
        setError(response.message || 'Failed to generate recipe');
      }
    } catch (err) {
      setError('An error occurred while generating the recipe');
      console.error('Recipe generation error:', err);
    } finally {
      setIsGenerating(false);
    }
  };

  const formatInstructions = (instructions: string) => {
    return instructions.split('\n\n').filter(step => step.trim());
  };

  const formatTime = (minutes?: number) => {
    if (!minutes) return 'N/A';
    if (minutes < 60) return `${minutes} min`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  };

  if (userIngredients.length === 0) {
    return (
      <div className="recipe-generator">
        <div className="no-ingredients">
          <h3>No Ingredients Found</h3>
          <p>Add some ingredients to your pantry first to generate recipes!</p>
        </div>
      </div>
    );
  }

  return (
    <div className="recipe-generator">
      <div className="generator-header">
        <h2>🤖 AI Recipe Generator</h2>
        <p>Select ingredients from your pantry and let AI create a delicious recipe!</p>
      </div>

      {!generatedRecipe && (
        <div className="generation-form">
          <div className="ingredients-selection">
            <div className="selection-header">
              <h3>Select Ingredients ({selectedIngredients.length} of {userIngredients.length})</h3>
              <button 
                type="button" 
                onClick={handleSelectAll}
                className="select-all-btn"
              >
                {selectedIngredients.length === userIngredients.length ? 'Deselect All' : 'Select All'}
              </button>
            </div>
            
            <div className="ingredients-grid">
              {userIngredients.map(userIngredient => (
                <label key={userIngredient.id} className="ingredient-checkbox">
                  <input
                    type="checkbox"
                    checked={selectedIngredients.includes(userIngredient.ingredientId)}
                    onChange={() => handleIngredientToggle(userIngredient.ingredientId)}
                  />
                  <span className="ingredient-name">
                    {userIngredient.ingredient.name}
                    {userIngredient.quantity && userIngredient.unit && (
                      <span className="quantity">({userIngredient.quantity} {userIngredient.unit})</span>
                    )}
                  </span>
                </label>
              ))}
            </div>
          </div>

          <div className="recipe-preferences">
            <h3>Recipe Preferences</h3>
            
            <div className="preference-group">
              <label htmlFor="cuisine">Cuisine Style</label>
              <select 
                id="cuisine"
                value={cuisine} 
                onChange={(e) => setCuisine(e.target.value)}
              >
                <option value="">Any cuisine</option>
                {cuisineOptions.slice(1).map(option => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            </div>

            <div className="preference-group">
              <label htmlFor="servings">Servings</label>
              <input
                id="servings"
                type="number"
                min="1"
                max="12"
                value={servings}
                onChange={(e) => setServings(parseInt(e.target.value) || 4)}
              />
            </div>

            <div className="preference-group">
              <label htmlFor="maxPrepTime">Max Prep Time (minutes)</label>
              <input
                id="maxPrepTime"
                type="number"
                min="5"
                max="180"
                value={maxPrepTime || ''}
                placeholder="Optional"
                onChange={(e) => setMaxPrepTime(e.target.value ? parseInt(e.target.value) : undefined)}
              />
            </div>
          </div>

          {error && (
            <div className="error-message">
              <p>❌ {error}</p>
            </div>
          )}

          <button 
            onClick={handleGenerateRecipe}
            disabled={isGenerating || selectedIngredients.length === 0}
            className="generate-btn"
          >
            {isGenerating ? (
              <>
                <span className="loading-spinner"></span>
                Generating Recipe...
              </>
            ) : (
              <>✨ Generate Recipe</>
            )}
          </button>
        </div>
      )}

      {generatedRecipe && (
        <div className="generated-recipe">
          <div className="recipe-header">
            <h2>{generatedRecipe.title}</h2>
            {generatedRecipe.description && (
              <p className="recipe-description">{generatedRecipe.description}</p>
            )}
            
            <div className="recipe-meta">
              <div className="meta-item">
                <span className="meta-label">Prep Time:</span>
                <span className="meta-value">{formatTime(generatedRecipe.prepTime)}</span>
              </div>
              <div className="meta-item">
                <span className="meta-label">Cook Time:</span>
                <span className="meta-value">{formatTime(generatedRecipe.cookTime)}</span>
              </div>
              <div className="meta-item">
                <span className="meta-label">Servings:</span>
                <span className="meta-value">{generatedRecipe.servings}</span>
              </div>
              {generatedRecipe.difficulty && (
                <div className="meta-item">
                  <span className="meta-label">Difficulty:</span>
                  <span className={`difficulty-badge ${generatedRecipe.difficulty}`}>
                    {generatedRecipe.difficulty}
                  </span>
                </div>
              )}
            </div>

            {generatedRecipe.tags.length > 0 && (
              <div className="recipe-tags">
                {generatedRecipe.tags.map(tag => (
                  <span key={tag} className="tag">{tag}</span>
                ))}
              </div>
            )}
          </div>

          <div className="recipe-content">
            <div className="recipe-ingredients">
              <h3>Ingredients</h3>
              <ul>
                {generatedRecipe.recipeIngredients.map(ri => (
                  <li key={ri.id} className={ri.optional ? 'optional' : ''}>
                    {ri.quantity && ri.unit && (
                      <span className="ingredient-amount">{ri.quantity} {ri.unit}</span>
                    )}
                    <span className="ingredient-name">{ri.ingredient.name}</span>
                    {ri.optional && <span className="optional-label">(optional)</span>}
                  </li>
                ))}
              </ul>
            </div>

            <div className="recipe-instructions">
              <h3>Instructions</h3>
              <ol>
                {formatInstructions(generatedRecipe.instructions).map((step, index) => (
                  <li key={index}>{step}</li>
                ))}
              </ol>
            </div>

            {generatedRecipe.nutritionalInfo && (
              <div className="nutrition-info">
                <h3>Nutritional Information (per serving)</h3>
                <div className="nutrition-grid">
                  <div className="nutrition-item">
                    <span className="nutrition-value">{generatedRecipe.nutritionalInfo.calories}</span>
                    <span className="nutrition-label">calories</span>
                  </div>
                  <div className="nutrition-item">
                    <span className="nutrition-value">{generatedRecipe.nutritionalInfo.protein}</span>
                    <span className="nutrition-label">protein</span>
                  </div>
                  <div className="nutrition-item">
                    <span className="nutrition-value">{generatedRecipe.nutritionalInfo.carbs}</span>
                    <span className="nutrition-label">carbs</span>
                  </div>
                  <div className="nutrition-item">
                    <span className="nutrition-value">{generatedRecipe.nutritionalInfo.fat}</span>
                    <span className="nutrition-label">fat</span>
                  </div>
                  {generatedRecipe.nutritionalInfo.fiber && (
                    <div className="nutrition-item">
                      <span className="nutrition-value">{generatedRecipe.nutritionalInfo.fiber}</span>
                      <span className="nutrition-label">fiber</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="recipe-actions">
            <button 
              onClick={() => setGeneratedRecipe(null)}
              className="generate-another-btn"
            >
              🔄 Generate Another Recipe
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default RecipeGenerator;