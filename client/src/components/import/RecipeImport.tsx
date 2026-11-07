import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { recipesApi } from '../../services/api';
import type { RecipeImportDraft } from '../../types';
import './RecipeImport.css';

interface Props {
  onSaved: (recipeId: number) => void;
  onCancel: () => void;
  initialUrl?: string;
  initialKoreanTitle?: string;
}

const RecipeImport: React.FC<Props> = ({ onSaved, onCancel, initialUrl, initialKoreanTitle }) => {
  const { token } = useAuth();
  const [url, setUrl] = useState('');
  const [text, setText] = useState('');
  const [preview, setPreview] = useState<RecipeImportDraft | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const autoPreviewed = useRef(false);
  const previewRequest = useRef<AbortController | null>(null);

  const update = <K extends keyof RecipeImportDraft>(key: K, value: RecipeImportDraft[K]) => {
    setPreview(current => current ? { ...current, [key]: value } : current);
  };

  const previewRecipe = useCallback(async (requestedUrl?: string) => {
    setBusy(true);
    setError('');
    setPreview(null);
    previewRequest.current?.abort();
    const controller = new AbortController();
    previewRequest.current = controller;
    const source = text.trim()
      ? { text: text.trim() }
      : { url: requestedUrl || url.trim() || undefined };
    const response = await recipesApi.previewImport(source, token || undefined, controller.signal);
    if (controller.signal.aborted) return;
    if (response.success && response.data) {
      setPreview({ ...response.data.draft, koreanTitle: initialKoreanTitle || response.data.draft.koreanTitle || '' });
      setWarnings(response.data.warnings);
    } else {
      const fallback = source.url
        ? 'This page could not be imported. Paste the recipe text below and preview it again.'
        : 'Could not read those recipe details. Check the text and try again.';
      setError(response.message || fallback);
    }
    setBusy(false);
  }, [initialKoreanTitle, text, token, url]);

  const submitPreview = (event: React.FormEvent) => {
    event.preventDefault();
    void previewRecipe();
  };

  useEffect(() => {
    if (!initialUrl || autoPreviewed.current) return;
    autoPreviewed.current = true;
    setUrl(initialUrl);
    void previewRecipe(initialUrl);
  }, [initialUrl, previewRecipe]);

  const cancel = () => {
    previewRequest.current?.abort();
    onCancel();
  };

  const saveRecipe = async () => {
    if (!preview) return;
    setBusy(true);
    setError('');
    const response = await recipesApi.saveImport(preview, token || undefined);
    if (response.success && response.data) onSaved(response.data.recipe.id);
    else setError(response.message || 'Could not save this recipe. Check the details and try again.');
    setBusy(false);
  };

  const setNumber = (key: 'prepTime' | 'cookTime' | 'servings', value: string) => {
    update(key, value === '' ? (key === 'servings' ? 1 : null) : Number(value));
  };

  return (
    <section className="recipe-import" aria-labelledby="import-heading">
      <header className="import-header">
        <div>
          <h2 id="import-heading">Import a recipe</h2>
          <p>Preview and correct the details before saving it privately.</p>
        </div>
        <button type="button" className="import-cancel" onClick={cancel}>Cancel</button>
      </header>

      {!preview && <form onSubmit={submitPreview} className="import-source-form">
        <label htmlFor="import-url">Recipe link</label>
        <input id="import-url" type="url" value={url} onChange={event => setUrl(event.target.value)} placeholder="https://example.com/recipe" />
        <label htmlFor="import-text">Recipe text</label>
        <textarea id="import-text" aria-label="Recipe text" value={text} onChange={event => setText(event.target.value)} rows={9} placeholder={'Paste ingredients and instructions here'} />
        <button className="import-primary" type="submit" disabled={busy || (!url.trim() && !text.trim())}>
          {busy ? 'Preparing preview…' : 'Preview recipe'}
        </button>
      </form>}

      {error && <div className="import-error" role="alert">{error}</div>}

      {preview && <div className="import-preview">
        {warnings.length > 0 && <aside className="import-warnings" aria-label="Import notes">
          <strong>Check these details</strong>
          <ul>{warnings.map((warning, index) => <li key={`${warning}-${index}`}>{warning}</li>)}</ul>
        </aside>}
        <label htmlFor="draft-title">Title</label>
        <input id="draft-title" value={preview.title} onChange={event => update('title', event.target.value)} required />
        <label htmlFor="draft-korean-title">Korean title</label>
        <input id="draft-korean-title" lang="ko" value={preview.koreanTitle || ''} onChange={event => update('koreanTitle', event.target.value)} />
        <label htmlFor="draft-description">Description</label>
        <textarea id="draft-description" value={preview.description} onChange={event => update('description', event.target.value)} rows={2} />
        <label htmlFor="draft-ingredients">Ingredients, one per line</label>
        <textarea id="draft-ingredients" value={preview.ingredients.join('\n')} onChange={event => update('ingredients', event.target.value.split('\n'))} rows={6} />
        <label htmlFor="draft-instructions">Steps, one per line</label>
        <textarea id="draft-instructions" value={preview.instructions} onChange={event => update('instructions', event.target.value)} rows={7} />
        <div className="import-fields-row">
          <div><label htmlFor="draft-prep">Prep minutes</label><input id="draft-prep" type="number" min="0" value={preview.prepTime ?? ''} onChange={event => setNumber('prepTime', event.target.value)} /></div>
          <div><label htmlFor="draft-cook">Cook minutes</label><input id="draft-cook" type="number" min="0" value={preview.cookTime ?? ''} onChange={event => setNumber('cookTime', event.target.value)} /></div>
          <div><label htmlFor="draft-servings">Servings</label><input id="draft-servings" type="number" min="1" value={preview.servings} onChange={event => setNumber('servings', event.target.value)} /></div>
        </div>
        <label htmlFor="draft-source-name">Source name</label>
        <input id="draft-source-name" value={preview.sourceName} onChange={event => update('sourceName', event.target.value)} />
        <label htmlFor="draft-source-url">Source link</label>
        <input id="draft-source-url" type="url" value={preview.sourceUrl} onChange={event => update('sourceUrl', event.target.value)} />
        <label htmlFor="draft-cuisines">Cuisine or style labels</label>
        <input id="draft-cuisines" value={preview.cuisineTypes.join(', ')} onChange={event => update('cuisineTypes', event.target.value.split(',').map(value => value.trim()).filter(Boolean))} />
        <p className="import-privacy-note">Cuisine labels describe a recipe style; they do not establish its exclusive origin.</p>
        <div className="import-actions">
          <button type="button" className="import-secondary" onClick={() => setPreview(null)}>Start over</button>
          <button type="button" className="import-primary" onClick={saveRecipe} disabled={busy || !preview.title.trim() || !preview.ingredients.some(line => line.trim()) || !preview.instructions.trim()}>
            {busy ? 'Saving…' : 'Save privately'}
          </button>
        </div>
      </div>}
    </section>
  );
};

export default RecipeImport;
