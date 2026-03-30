import React, { useState, useEffect } from 'react';
import type { Recipe, RecipeIngredientInput, CreateRecipeData, UpdateRecipeData } from '../types';
import { recipesApi } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import IngredientSearch from './IngredientSearch';
import type { Ingredient } from '../types';
import './RecipeForm.css';

interface RecipeFormProps {
  recipe?: Recipe; // if provided, form is in edit mode
  onSaved: (recipe: Recipe) => void;
  onCancel: () => void;
}

const DIETARY_OPTIONS = [
  'vegetarian', 'vegan', 'gluten-free', 'dairy-free',
  'nut-free', 'keto', 'paleo', 'low-carb', 'halal', 'kosher',
];

const DIFFICULTY_OPTIONS = ['easy', 'medium', 'hard'];

const RecipeForm: React.FC<RecipeFormProps> = ({ recipe, onSaved, onCancel }) => {
  const { token } = useAuth();
  const isEditing = !!recipe;

  const [title, setTitle] = useState(recipe?.title || '');
  const [description, setDescription] = useState(recipe?.description || '');
  const [instructions, setInstructions] = useState(recipe?.instructions || '');
  const [prepTime, setPrepTime] = useState(recipe?.prepTime?.toString() || '');
  const [cookTime, setCookTime] = useState(recipe?.cookTime?.toString() || '');
  const [servings, setServings] = useState(recipe?.servings?.toString() || '4');
  const [difficulty, setDifficulty] = useState(recipe?.difficulty || '');
  const [cuisineInput, setCuisineInput] = useState('');
  const [cuisineTypes, setCuisineTypes] = useState<string[]>(recipe?.cuisineTypes || []);
  const [tagInput, setTagInput] = useState('');
  const [tags, setTags] = useState<string[]>(recipe?.tags || []);
  const [dietaryTags, setDietaryTags] = useState<string[]>(recipe?.dietaryTags || []);
  const [allergenInput, setAllergenInput] = useState('');
  const [allergens, setAllergens] = useState<string[]>(recipe?.allergens || []);
  const [sourceUrl, setSourceUrl] = useState(recipe?.sourceUrl || '');
  const [sourceName, setSourceName] = useState(recipe?.sourceName || '');
  const [isPublic, setIsPublic] = useState(recipe?.isPublic || false);
  const [personalNotes, setPersonalNotes] = useState(recipe?.personalNotes || '');

  const [ingredients, setIngredients] = useState<RecipeIngredientInput[]>(() => {
    if (!recipe) return [];
    return recipe.recipeIngredients.map(ri => ({
      ingredientId: ri.ingredient.id,
      name: ri.ingredient.name,
      commonUnits: ri.ingredient.commonUnits || [],
      quantity: ri.quantity,
      unit: ri.unit,
      optional: ri.optional,
      preparationNote: ri.preparationNote,
    }));
  });

  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleIngredientSelect = (ingredient: Ingredient) => {
    if (ingredients.find(i => i.ingredientId === ingredient.id)) return;
    setIngredients(prev => [...prev, {
      ingredientId: ingredient.id,
      name: ingredient.name,
      commonUnits: ingredient.commonUnits || [],
      optional: false,
    }]);
  };

  const updateIngredient = (index: number, field: keyof RecipeIngredientInput, value: any) => {
    setIngredients(prev => prev.map((ing, i) =>
      i === index ? { ...ing, [field]: value } : ing
    ));
  };

  const removeIngredient = (index: number) => {
    setIngredients(prev => prev.filter((_, i) => i !== index));
  };

  const addTag = (value: string, setter: React.Dispatch<React.SetStateAction<string[]>>, inputSetter: React.Dispatch<React.SetStateAction<string>>) => {
    const trimmed = value.trim().toLowerCase();
    if (trimmed) {
      setter(prev => prev.includes(trimmed) ? prev : [...prev, trimmed]);
    }
    inputSetter('');
  };

  const handleTagKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>,
    value: string,
    setter: React.Dispatch<React.SetStateAction<string[]>>,
    inputSetter: React.Dispatch<React.SetStateAction<string>>
  ) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addTag(value, setter, inputSetter);
    }
  };

  const toggleDietaryTag = (tag: string) => {
    setDietaryTags(prev =>
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !instructions.trim()) {
      setError('Title and instructions are required');
      return;
    }

    setIsSaving(true);
    setError(null);

    const payload = {
      title: title.trim(),
      description: description.trim() || undefined,
      instructions: instructions.trim(),
      ingredients: ingredients.map(i => ({
        ingredientId: i.ingredientId,
        quantity: i.quantity,
        unit: i.unit || undefined,
        optional: i.optional,
        preparationNote: i.preparationNote?.trim() || undefined,
      })),
      prepTime: prepTime ? parseInt(prepTime) : undefined,
      cookTime: cookTime ? parseInt(cookTime) : undefined,
      servings: servings ? parseInt(servings) : 4,
      cuisineTypes,
      tags,
      dietaryTags,
      allergens,
      difficulty: difficulty || undefined,
      sourceUrl: sourceUrl.trim() || undefined,
      sourceName: sourceName.trim() || undefined,
      isPublic,
      ...(isEditing && { personalNotes: personalNotes.trim() || undefined }),
    };

    let response;
    if (isEditing) {
      response = await recipesApi.updateRecipe(recipe.id, payload as UpdateRecipeData, token || undefined);
    } else {
      response = await recipesApi.createRecipe(payload as CreateRecipeData, token || undefined);
    }

    if (response.success && response.data) {
      onSaved(response.data.recipe);
    } else {
      setError(response.message || 'Failed to save recipe');
    }
    setIsSaving(false);
  };

  return (
    <div className="recipe-form-container">
      <div className="form-nav">
        <h2>{isEditing ? 'Edit Recipe' : 'New Recipe'}</h2>
        <button className="back-btn" onClick={onCancel}>Cancel</button>
      </div>

      {error && (
        <div className="error-message">
          {error}
          <button onClick={() => setError(null)} className="error-close">×</button>
        </div>
      )}

      <form onSubmit={handleSubmit} className="recipe-form">
        <section className="form-section">
          <div className="form-group">
            <label htmlFor="title">Title *</label>
            <input
              id="title"
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="e.g. Chicken Tikka Masala"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="description">Description</label>
            <textarea
              id="description"
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Brief summary of the dish"
              rows={2}
            />
          </div>
        </section>

        <section className="form-section">
          <h3>Ingredients</h3>
          <IngredientSearch
            onIngredientSelect={handleIngredientSelect}
            placeholder="Search and add an ingredient..."
          />
          {ingredients.length > 0 && (
            <div className="ingredient-rows">
              {ingredients.map((ing, i) => (
                <div key={ing.ingredientId} className="ingredient-row">
                  <span className="ing-name">{ing.name}</span>
                  <input
                    type="number"
                    placeholder="Qty"
                    value={ing.quantity ?? ''}
                    onChange={e => updateIngredient(i, 'quantity', e.target.value ? parseFloat(e.target.value) : undefined)}
                    step="0.1"
                    min="0"
                    className="ing-qty"
                  />
                  <select
                    value={ing.unit || ''}
                    onChange={e => updateIngredient(i, 'unit', e.target.value || undefined)}
                    className="ing-unit"
                  >
                    <option value="">unit</option>
                    {ing.commonUnits.map(u => (
                      <option key={u} value={u}>{u}</option>
                    ))}
                    <option value="to taste">to taste</option>
                    <option value="whole">whole</option>
                    <option value="slice">slice</option>
                    <option value="piece">piece</option>
                  </select>
                  <input
                    type="text"
                    placeholder="Prep note (e.g. diced)"
                    value={ing.preparationNote || ''}
                    onChange={e => updateIngredient(i, 'preparationNote', e.target.value)}
                    className="ing-note"
                  />
                  <label className="ing-optional">
                    <input
                      type="checkbox"
                      checked={ing.optional}
                      onChange={e => updateIngredient(i, 'optional', e.target.checked)}
                    />
                    optional
                  </label>
                  <button type="button" className="remove-ing-btn" onClick={() => removeIngredient(i)}>×</button>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="form-section">
          <div className="form-group">
            <label htmlFor="instructions">Instructions *</label>
            <textarea
              id="instructions"
              value={instructions}
              onChange={e => setInstructions(e.target.value)}
              placeholder="Enter each step on a new line..."
              rows={8}
              required
            />
          </div>
        </section>

        <section className="form-section">
          <h3>Time & Difficulty</h3>
          <div className="form-row-3">
            <div className="form-group">
              <label htmlFor="prepTime">Prep Time (min)</label>
              <input
                id="prepTime"
                type="number"
                value={prepTime}
                onChange={e => setPrepTime(e.target.value)}
                min="0"
                placeholder="15"
              />
            </div>
            <div className="form-group">
              <label htmlFor="cookTime">Cook Time (min)</label>
              <input
                id="cookTime"
                type="number"
                value={cookTime}
                onChange={e => setCookTime(e.target.value)}
                min="0"
                placeholder="30"
              />
            </div>
            <div className="form-group">
              <label htmlFor="servings">Servings</label>
              <input
                id="servings"
                type="number"
                value={servings}
                onChange={e => setServings(e.target.value)}
                min="1"
                placeholder="4"
              />
            </div>
          </div>
          <div className="form-group">
            <label htmlFor="difficulty">Difficulty</label>
            <select id="difficulty" value={difficulty} onChange={e => setDifficulty(e.target.value)}>
              <option value="">Select difficulty</option>
              {DIFFICULTY_OPTIONS.map(d => (
                <option key={d} value={d}>{d.charAt(0).toUpperCase() + d.slice(1)}</option>
              ))}
            </select>
          </div>
        </section>

        <section className="form-section">
          <h3>Categories & Tags</h3>
          <div className="form-group">
            <label>Cuisine Types</label>
            <div className="tag-input-row">
              <input
                type="text"
                value={cuisineInput}
                onChange={e => setCuisineInput(e.target.value)}
                onKeyDown={e => handleTagKeyDown(e, cuisineInput, setCuisineTypes, setCuisineInput)}
                placeholder="e.g. Italian — press Enter to add"
              />
              <button type="button" className="btn-add-tag" onClick={() => addTag(cuisineInput, setCuisineTypes, setCuisineInput)}>Add</button>
            </div>
            <div className="tag-chips">
              {cuisineTypes.map(c => (
                <span key={c} className="chip chip-cuisine">
                  {c} <button type="button" onClick={() => setCuisineTypes(p => p.filter(x => x !== c))}>×</button>
                </span>
              ))}
            </div>
          </div>

          <div className="form-group">
            <label>Dietary Tags</label>
            <div className="dietary-checkboxes">
              {DIETARY_OPTIONS.map(opt => (
                <label key={opt} className="dietary-option">
                  <input
                    type="checkbox"
                    checked={dietaryTags.includes(opt)}
                    onChange={() => toggleDietaryTag(opt)}
                  />
                  {opt}
                </label>
              ))}
            </div>
          </div>

          <div className="form-group">
            <label>Tags</label>
            <div className="tag-input-row">
              <input
                type="text"
                value={tagInput}
                onChange={e => setTagInput(e.target.value)}
                onKeyDown={e => handleTagKeyDown(e, tagInput, setTags, setTagInput)}
                placeholder="e.g. quick, weeknight — press Enter to add"
              />
              <button type="button" className="btn-add-tag" onClick={() => addTag(tagInput, setTags, setTagInput)}>Add</button>
            </div>
            <div className="tag-chips">
              {tags.map(t => (
                <span key={t} className="chip">
                  {t} <button type="button" onClick={() => setTags(p => p.filter(x => x !== t))}>×</button>
                </span>
              ))}
            </div>
          </div>

          <div className="form-group">
            <label>Allergens</label>
            <div className="tag-input-row">
              <input
                type="text"
                value={allergenInput}
                onChange={e => setAllergenInput(e.target.value)}
                onKeyDown={e => handleTagKeyDown(e, allergenInput, setAllergens, setAllergenInput)}
                placeholder="e.g. peanuts, shellfish — press Enter to add"
              />
              <button type="button" className="btn-add-tag" onClick={() => addTag(allergenInput, setAllergens, setAllergenInput)}>Add</button>
            </div>
            <div className="tag-chips">
              {allergens.map(a => (
                <span key={a} className="chip chip-allergen">
                  {a} <button type="button" onClick={() => setAllergens(p => p.filter(x => x !== a))}>×</button>
                </span>
              ))}
            </div>
          </div>
        </section>

        <section className="form-section">
          <h3>Source (optional)</h3>
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="sourceUrl">URL</label>
              <input
                id="sourceUrl"
                type="url"
                value={sourceUrl}
                onChange={e => setSourceUrl(e.target.value)}
                placeholder="https://..."
              />
            </div>
            <div className="form-group">
              <label htmlFor="sourceName">Source Name</label>
              <input
                id="sourceName"
                type="text"
                value={sourceName}
                onChange={e => setSourceName(e.target.value)}
                placeholder="e.g. NYT Cooking"
              />
            </div>
          </div>
        </section>

        {isEditing && (
          <section className="form-section">
            <div className="form-group">
              <label htmlFor="personalNotes">Personal Notes</label>
              <textarea
                id="personalNotes"
                value={personalNotes}
                onChange={e => setPersonalNotes(e.target.value)}
                placeholder="Notes just for you — substitutions you tried, family reactions, etc."
                rows={3}
              />
            </div>
          </section>
        )}

        <section className="form-section">
          <label className="share-toggle">
            <input
              type="checkbox"
              checked={isPublic}
              onChange={e => setIsPublic(e.target.checked)}
            />
            Share this recipe with all users
          </label>
        </section>

        <div className="form-submit">
          <button type="submit" className="btn btn-primary" disabled={isSaving}>
            {isSaving ? 'Saving...' : isEditing ? 'Save Changes' : 'Create Recipe'}
          </button>
          <button type="button" className="btn btn-secondary" onClick={onCancel}>
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
};

export default RecipeForm;
