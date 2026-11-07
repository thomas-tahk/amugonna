import { useState } from 'react';
import { kitchenApi, type ExclusionPreferences } from '../../services/kitchenApi';

export default function Exclusions({ onSaved }: { onSaved: () => void }) {
  const [preferences, setPreferences] = useState<ExclusionPreferences | null>(null);
  const [custom, setCustom] = useState('');
  const [reviewed, setReviewed] = useState('');
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');
  const [saving, setSaving] = useState(false);
  const load = async () => {
    setError('');
    try {
      const saved = await kitchenApi.exclusions();
      setPreferences(saved);
      setCustom(saved.excludedIngredients.join(', '));
      setReviewed(saved.reviewedIngredients.join(', '));
    } catch (e) { setError((e as Error).message); }
  };
  const toggle = (id: string) => {
    if (!preferences) return;
    const selected = preferences.avoidedAllergens;
    setPreferences({ ...preferences, avoidedAllergens: selected.includes(id) ? selected.filter(a => a !== id) : [...selected, id] });
    setStatus('Unsaved changes');
  };
  const save = async () => {
    if (!preferences) return;
    setSaving(true);
    setError('');
    try {
      const saved = await kitchenApi.saveExclusions({
        avoidedAllergens: preferences.avoidedAllergens,
        excludedIngredients: custom.split(',').map(s => s.trim()).filter(Boolean),
        reviewedIngredients: reviewed.split(',').map(s => s.trim()).filter(Boolean),
      });
      setPreferences(saved);
      setCustom(saved.excludedIngredients.join(', '));
      setReviewed(saved.reviewedIngredients.join(', '));
      setStatus('Exclusions saved');
      onSaved();
    } catch (e) { setError((e as Error).message); }
    finally { setSaving(false); }
  };
  return (
    <details className="card kitchen-exclusions" onToggle={e => { if (e.currentTarget.open && !preferences) void load(); }}>
      <summary>Foods to avoid</summary>
      <p>Hide recipes containing these foods, including optional ingredients. Excluded foods are never used as swaps.</p>
      {error && <p role="alert">{error} <button className="btn btn-secondary" onClick={() => void load()}>Reload exclusions</button></p>}
      {!preferences && !error && <p>Loading exclusions…</p>}
      {preferences && <>
        <fieldset disabled={saving}>
          <legend>Common allergens</legend>
          <div className="exclusion-presets">
            {Object.entries(preferences.allergens).map(([id, label]) => (
              <label key={id}><input type="checkbox" checked={preferences.avoidedAllergens.includes(id)} onChange={() => toggle(id)} /> {label}</label>
            ))}
          </div>
          <p>Milk / dairy includes lactose-free dairy, whey, casein, butter, cheese and cream.</p>
          <label htmlFor="custom-exclusions">Other ingredients to avoid</label>
          <input id="custom-exclusions" className="input" value={custom} placeholder="e.g. mushrooms, coriander" onChange={e => { setCustom(e.target.value); setStatus('Unsaved changes'); }} />
          <p>Separate ingredients with commas. Known aliases and ingredient families are included.</p>
          <label htmlFor="reviewed-ingredients">Ingredients with labels I have checked</label>
          <input id="reviewed-ingredients" className="input" value={reviewed} placeholder="e.g. kimchi, broth" onChange={e => { setReviewed(e.target.value); setStatus('Unsaved changes'); }} />
          <p>Only confirm your actual products after checking labels against your exclusions. This clears ingredient uncertainty; explicit excluded foods stay excluded.</p>
          <button type="button" className="btn btn-primary" onClick={() => void save()}>{saving ? 'Saving…' : 'Save exclusions'}</button>
        </fieldset>
        <p role="status">{status}</p>
      </>}
      <p>Recipes with unrecognized or variable ingredients are held back for label review. Check product labels; recipe data cannot establish cross-contact safety.</p>
    </details>
  );
}
